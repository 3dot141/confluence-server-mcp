// src/domain/markdown/__tests__/converter-emoji.spec.ts
import { describe, it, expect } from 'vitest';
import { MarkdownToConfluenceConverter } from '../converter.js';

describe('MarkdownToConfluenceConverter - Emoji Removal', () => {
  const converter = new MarkdownToConfluenceConverter({ addTocMacro: false });

  describe('Unicode Emoji 移除', () => {
    it('应该移除笑脸 emoji', () => {
      const markdown = 'Hello 😀 World';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>Hello World</p>');
      expect(result).not.toContain('😀');
    });

    it('应该移除多个 emoji', () => {
      const markdown = '🎉 庆祝 🚀 成功 ✨ 完成';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>庆祝 成功 完成</p>');
      expect(result).not.toContain('🎉');
      expect(result).not.toContain('🚀');
      expect(result).not.toContain('✨');
    });

    it('应该移除旗帜 emoji', () => {
      const markdown = '中国 🇨🇳 美国 🇺🇸';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>中国 美国</p>');
      expect(result).not.toContain('🇨🇳');
      expect(result).not.toContain('🇺🇸');
    });

    it('应该移除符号和箭头 emoji', () => {
      const markdown = '注意 → 方向 ★ 星级';
      const result = converter.convert(markdown);
      expect(result).not.toContain('→');
      expect(result).not.toContain('★');
    });
  });

  describe('Emoji Shortcode 移除', () => {
    it('应该移除 shortcode 格式的 emoji', () => {
      const markdown = 'Hello :smile: World';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>Hello World</p>');
      expect(result).not.toContain(':smile:');
    });

    it('应该移除多个 shortcode', () => {
      const markdown = ':rocket: 发射 :moon: 登陆';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>发射 登陆</p>');
      expect(result).not.toContain(':rocket:');
      expect(result).not.toContain(':moon:');
    });

    it('应该保留普通冒号文本', () => {
      const markdown = '时间: 10:00';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>时间: 10:00</p>');
    });
  });

  describe('混合内容', () => {
    it('应该同时移除 Unicode emoji 和 shortcode', () => {
      const markdown = '🎉 庆祝 :rocket: 成功';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>庆祝 成功</p>');
      expect(result).not.toContain('🎉');
      expect(result).not.toContain(':rocket:');
    });

    it('应该在标题中移除 emoji', () => {
      const markdown = '# 🎉 庆祝标题';
      const result = converter.convert(markdown);
      expect(result).toContain('<h1>庆祝标题</h1>');
      expect(result).not.toContain('🎉');
    });

    it('应该在列表项中移除 emoji', () => {
      const markdown = `- ✅ 任务一
- 📝 任务二
- :star: 任务三`;
      const result = converter.convert(markdown);
      expect(result).toContain('<li>任务一</li>');
      expect(result).toContain('<li>任务二</li>');
      expect(result).toContain('<li>任务三</li>');
      expect(result).not.toContain('✅');
      expect(result).not.toContain('📝');
      expect(result).not.toContain(':star:');
    });

    it('应该在待办事项中移除 emoji', () => {
      const markdown = '- [ ] 🎯 目标任务';
      const result = converter.convert(markdown);
      expect(result).toContain('<ac:task-body>目标任务</ac:task-body>');
      expect(result).not.toContain('🎯');
    });
  });

  describe('边界情况', () => {
    it('应该处理只有 emoji 的内容', () => {
      const markdown = '😀🎉🚀';
      const result = converter.convert(markdown);
      expect(result).not.toContain('😀');
      expect(result).not.toContain('🎉');
      expect(result).not.toContain('🚀');
    });

    it('应该处理没有 emoji 的内容', () => {
      const markdown = '普通文本内容';
      const result = converter.convert(markdown);
      expect(result).toContain('<p>普通文本内容</p>');
    });

    it('应该正确保留 markdown 格式', () => {
      const markdown = '**粗体** 🎉 *斜体*';
      const result = converter.convert(markdown);
      expect(result).toContain('<strong>粗体</strong>');
      expect(result).toContain('<em>斜体</em>');
      expect(result).not.toContain('🎉');
    });

    it('应该保留代码块中的内容（包括 emoji 也会被移除）', () => {
      const markdown = "```javascript\nconsole.log(\"Hello 🎉\");\n```";
      const result = converter.convert(markdown);
      expect(result).toContain('<ac:structured-macro ac:name="code">');
      expect(result).toContain('console.log("Hello ");');
      expect(result).not.toContain('🎉');
    });
  });
});
