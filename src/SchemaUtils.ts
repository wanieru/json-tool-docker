import { FsWrap } from "./Utils/FsWrap";
import { Schema } from "./www/Schema";

export class SchemaUtils
{
    public static async getJsons(schema: Schema)
    {
        return await FsWrap.getAllFilesInDir("./jsons", schema.getRegex());
    }

    public static async hasJson(schema: Schema, file: string)
    {
        return (await SchemaUtils.getJsons(schema)).includes(file)
    }
    public static async getJson(schema: Schema, file: string)
    {
        if (!(await SchemaUtils.getJsons(schema)).includes(file)) return null;
        try
        {
            const json = await FsWrap.loadFile(file);
            return JSON.parse(json);
        }
        catch (e)
        {
            return null;
        }
    }


    public static async getSchemas(files?: string[])
    {
        const result = [] as Schema[];

        let schemaFiles = await FsWrap.getAllFilesInDir("./schemas", /\.js$/);
        if (!!files)
        {
            schemaFiles = schemaFiles.filter(s => files.includes(s));
        }
        await (async () =>
        {
            for (const file of schemaFiles)
            {
                const content = await FsWrap.loadFile(file);
                Schema.parseSchema(file, content, result);
            }
        })();
        return result;
    }

    public static async setJson(schema: Schema, file: string, value: any)
    {
        if (!(await SchemaUtils.getJsons(schema)).includes(file)) return;
        await FsWrap.saveFile(file, JSON.stringify(value, null, 3));
    }
}