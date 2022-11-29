import { ApiUtils } from "./ApiUtils";

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
        return await ApiUtils.run<{ schemaContent: string, value: any }>("/api", {
            command: "load",
            schema,
            json
        });
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