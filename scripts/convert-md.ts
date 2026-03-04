// scripts/convert-md.ts
// 将 Markdown 文件转换为 Confluence Storage Format

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ASTMarkdownToConfluenceConverter } from '../src/domain/markdown/ast-converter.js';

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('用法: npx tsx scripts/convert-md.ts <markdown-file> [output-file]');
    console.log('');
    console.log('示例:');
    console.log('  npx tsx scripts/convert-md.ts input.md output.xml');
    process.exit(1);
  }

  const inputFile = resolve(args[0]);
  const outputFile = args[1] ? resolve(args[1]) : inputFile.replace(/\.md$/, '.xml');

  console.log(`📄 读取文件: ${inputFile}`);

  try {
    // 读取 Markdown 文件
    const markdown = readFileSync(inputFile, 'utf-8');

    // 创建转换器
    const converter = new ASTMarkdownToConfluenceConverter({
      addTocMacro: true,
    });

    // 转换为 Storage Format
    console.log('🔄 转换为 Confluence Storage Format...');
    const result = converter.convertWithMetadata(markdown);

    // 写入输出文件
    writeFileSync(outputFile, result.storageFormat, 'utf-8');

    console.log('✅ 转换完成!');
    console.log(`📋 标题: ${result.title || '(未提取到标题)'}`);
    console.log(`💾 输出文件: ${outputFile}`);

  } catch (error) {
    console.error('❌ 转换失败:', error);
    process.exit(1);
  }
}

main();
