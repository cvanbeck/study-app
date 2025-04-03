import { Transform } from "stream";

/**
 * JSONStreamService is a custom Transform stream that processes a stream of JSON data.
 * It extracts complete JSON objects from an incoming data stream, aggregates specific content
 * chunks (if present), and outputs an updated aggregated JSON string.
 */
export default class JSONStreamService extends Transform {
    /**
     * Constructs a new JSONStreamService instance.
     * Initializes an empty buffer to accumulate stream data and an array to store extracted chunks.
     * @param {Object} options - Transform stream options.
     */
    constructor(options) {
        super(options);
        this.buffer = "";
        this.chunks = [];
    }

    /**
     * Processes incoming data chunks.
     * Appends each incoming chunk to an internal buffer and repeatedly attempts to extract
     * complete JSON objects from it. For each valid JSON object that contains the expected
     * content structure, it adds the content to a collection, aggregates the content based on
     * creation time, and pushes an updated JSON string of the aggregated content downstream.
     *
     * @param {Buffer|string} chunk - Incoming data chunk.
     * @param {string} encoding - The encoding type if chunk is a string.
     * @param {Function} callback - Callback to signal completion of processing.
     */
    _transform(chunk, encoding, callback) {
        this.buffer += chunk.toString();
        let extracted;
        // Extract all complete JSON objects from the buffer.
        while ((extracted = this.extractJSONObject(this.buffer)) !== null) {
            const { jsonObject, remainingBuffer } = extracted;
            this.buffer = remainingBuffer;
            // If the JSON object contains the target content, store it with a timestamp.
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
            // Sort collected chunks by creation time and aggregate the content.
            const aggregated = this.chunks
                .sort((a, b) => a.created - b.created)
                .map((c) => c.content)
                .join("");
            // Push the updated aggregated content downstream as a JSON string.
            this.push(JSON.stringify({ fullContent: aggregated }));
        }
        callback();
    }

    /**
     * Called when no more data is available for processing.
     * Processes any remaining data in the buffer, aggregates the final content,
     * pushes a final JSON string with the complete aggregated content, and adds
     * a termination marker ("[DONE]") to signal the end of the stream.
     *
     * @param {Function} callback - Callback to signal completion of flushing.
     */
    _flush(callback) {
        let extracted;
        // Process any remaining JSON objects in the buffer.
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
        // Final aggregation of content.
        const aggregated = this.chunks
            .sort((a, b) => a.created - b.created)
            .map((c) => c.content)
            .join("");
        // Emit the final aggregated content and a termination marker.
        this.push(JSON.stringify({ fullContent: aggregated }));
        this.push("[DONE]");
        callback();
    }

    /**
     * Attempts to extract a complete JSON object from the current buffer.
     * Uses a simple brace counting mechanism to detect valid JSON objects, while properly
     * handling strings and escaped characters.
     *
     * @param {string} buffer - The current buffer containing stream data.
     * @returns {Object|null} An object containing the parsed JSON object and the remaining buffer,
     *                        or null if no complete JSON object is found.
     */
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
                    // When all opened braces are closed, attempt to parse the JSON.
                    if (braceCount === 0) {
                        const jsonStr = buffer.substring(start, i + 1);
                        try {
                            const jsonObject = JSON.parse(jsonStr);
                            const remainingBuffer = buffer.substring(i + 1);
                            return { jsonObject, remainingBuffer };
                        } catch (e) {
                            // If JSON is incomplete, break and wait for more data.
                            break;
                        }
                    }
                }
            }
        }
        return null;
    }
}