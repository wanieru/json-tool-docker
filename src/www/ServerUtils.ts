import { ApiUtils } from "./ApiUtils";
import { Schema } from "./Schema";

export class ServerUtils
{
    public static async list()
    {
        return await ApiUtils.run<{ schemas: Record<string, string[]> }>("/api", {
            command: "list"
        });
    }
    public static async load(schema: string, json: string)
    {
        const result = await ApiUtils.run<{ schemaContent: string, value: any, schema: Schema }>("/api", {
            command: "load",
            schema,
            json
        });
        if (!result.body.schemaContent) return result;
        result.body.schema = Schema.parseSchema(schema, result.body.schemaContent)[0];
        return result;
    }
    public static async save(schema: string, json: string, value: any)
    {
        return await ApiUtils.run<{}>("/api", {
            command: "save",
            schema,
            json,
            value
        });
    }
}