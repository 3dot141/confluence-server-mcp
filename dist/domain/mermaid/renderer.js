export class MermaidRenderer {
    async render(source, options) {
        try {
            const baseUrl = process.env.MERMAID_INK_URL || "https://mermaid.ink";
            const encoded = Buffer.from(source).toString("base64");
            let imgUrl = `${baseUrl}/img/${encoded}`;
            const params = new URLSearchParams();
            if (options?.theme)
                params.set("theme", options.theme);
            if (options?.bgColor)
                params.set("bgColor", options.bgColor);
            const qs = params.toString();
            if (qs)
                imgUrl += `?${qs}`;
            const res = await fetch(imgUrl);
            if (!res.ok) {
                throw new Error(`Mermaid 渲染失败: HTTP ${res.status} ${res.statusText}`);
            }
            const imageBuffer = await res.arrayBuffer();
            return { id: options.id, source, success: true, imageBuffer };
        }
        catch (error) {
            return {
                id: options.id,
                source,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
//# sourceMappingURL=renderer.js.map