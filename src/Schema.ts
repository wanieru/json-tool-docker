import { JsonSchemaProperty } from "tsch/dist/JsonSchemaProperty";
import { TschType } from "tsch/dist/TschType";
import { FsWrap } from "./Utils/FsWrap";
import { tsch as tsch_global } from "tsch";

export class Schema
{
    private regex: RegExp;
    private jsonSchema: JsonSchemaProperty | undefined;
    private tsch: TschType<any, any> | undefined;
    private schemaFile: string;

    public constructor(schemaFile: string, name: string, jsonSchema?: JsonSchemaProperty, tsch?: TschType<any, any>)
    {
        this.schemaFile = schemaFile;
        this.regex = Schema.getRegex(name);
        this.jsonSchema = jsonSchema;
        this.tsch = tsch;
    }

    public getSchemaFile()
    {
        return this.schemaFile;
    }

    public async getJsons()
    {
        return await FsWrap.getAllFilesInDir("./jsons", this.regex);
    }
    public async getJson(file: string)
    {
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
    public async setJson(file: string, value: any)
    {
        if (!(await this.getJsons()).includes(file)) return;
        await FsWrap.saveFile(file, JSON.stringify(value, null, 3));
    }
    public validate(value: any)
    {
        if (!!this.tsch) return this.tsch.validate(value);
        return { valid: true, errors: [] };
    }
    public getJsonSchema()
    {
        if (!!this.tsch) return this.tsch.getJsonSchemaProperty();
        return this.jsonSchema;
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
                const addJsonSchema = (name: string, jsonSchema: JsonSchemaProperty) => Schema.addJsonSchema(result, file, name, jsonSchema);
                const addTsch = (name: string, tsch: TschType<any, any>) => Schema.addTsch(result, file, name, tsch);
                const tsch = tsch_global;

                const content = await FsWrap.loadFile(file);
                try
                {
                    "use strict";
                    eval(content);
                }
                catch (e)
                {
                    console.warn(`Exception during ${file}`, e);
                }
            }
        })();
        return result;
    }
    private static getRegex(name: string): RegExp
    {
        return new RegExp("^" + name.split("*")
            .map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
            .join(".*") + "$");
    }
    private static addJsonSchema(schemas: Schema[], schemaFile: string, name: string, jsonSchema: JsonSchemaProperty)
    {
        schemas.push(new Schema(schemaFile, name, jsonSchema));
    }
    private static addTsch(schemas: Schema[], schemaFile: string, name: string, tsch: TschType<any, any>)
    {
        schemas.push(new Schema(schemaFile, name, undefined, tsch));
    }
}