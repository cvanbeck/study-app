import { Transform } from "stream";

export default class JSONStreamService extends Transform {
    constructor(options) {
        super(options);
        this.buffer = "";
        this.chunks = [];
    }

    _transform(chunk, encoding, callback) {
        this.buffer += chunk.toString();
        let extracted;
        while ((extracted = this.extractJSONObject(this.buffer)) !== null) {
            const { jsonObject, remainingBuffer } = extracted;
            this.buffer = remainingBuffer;
            // Extract the content chunk if available.
            if (
                jsonObject.choices &&
                jsonObject.choices[0] &&
                jsonObject.choices[0].delta &&
                jsonObject.choices[0].delta.content
            ) {
                this.chunks.push({
                    created: jsonObject.created || Date.now(),
                    content: jsonObject.choices[0].delta.content,
                });
            }
            // Sort and join chunks to form the aggregated content.
            const aggregated = this.chunks
                .sort((a, b) => a.created - b.created)
                .map((c) => c.content)
                .join("");
            // Emit the updated aggregated content as a JSON string.
            this.push(JSON.stringify({ fullContent: deltaContent }));
        }
        callback();
    }

    _flush(callback) {
        let extracted;
        while ((extracted = this.extractJSONObject(this.buffer)) !== null) {
            const { jsonObject, remainingBuffer } = extracted;
            this.buffer = remainingBuffer;
            if (
                jsonObject.choices &&
                jsonObject.choices[0] &&
                jsonObject.choices[0].delta &&
                jsonObject.choices[0].delta.content
            ) {
                this.chunks.push({
                    created: jsonObject.created || Date.now(),
                    content: jsonObject.choices[0].delta.content,
                });
            }
        }
        const aggregated = this.chunks
            .sort((a, b) => a.created - b.created)
            .map((c) => c.content)
            .join("");
        // Final update and a termination marker.
        this.push(JSON.stringify({ fullContent: aggregated }));
        this.push("[DONE]");
        callback();
    }

    extractJSONObject(buffer) {
        const start = buffer.indexOf("{");
        if (start === -1) return null;
        let braceCount = 0;
        let inString = false;
        let escape = false;
        for (let i = start; i < buffer.length; i++) {
            const char = buffer[i];
            if (inString) {
                if (escape) {
                    escape = false;
                } else if (char === "\\") {
                    escape = true;
                } else if (char === '"') {
                    inString = false;
                }
            } else {
                if (char === '"') {
                    inString = true;
                } else if (char === "{") {
                    braceCount++;
                } else if (char === "}") {
                    braceCount--;
                    if (braceCount === 0) {
                        const jsonStr = buffer.substring(start, i + 1);
                        try {
                            const jsonObject = JSON.parse(jsonStr);
                            const remainingBuffer = buffer.substring(i + 1);
                            return { jsonObject, remainingBuffer };
                        } catch (e) {
                            // If JSON is incomplete, wait for more data.
                            break;
                        }
                    }
                }
            }
        }
        return null;
    }
}
