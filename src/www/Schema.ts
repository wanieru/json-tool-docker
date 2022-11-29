import { JsonSchemaProperty } from "tsch/dist/JsonSchemaProperty";
import { TschType } from "tsch/dist/TschType";
import { tsch as tsch_global } from "tsch";
import Ajv from "ajv";

export class Schema
{
    private regex: RegExp;
    private jsonSchema: JsonSchemaProperty | undefined;
    private tsch: TschType<any, any> | undefined;
    private schemaFile: string;
    private schemaContent: string;

    public constructor(schemaFile: string, schemaContent: string, name: string, jsonSchema?: JsonSchemaProperty, tsch?: TschType<any, any>)
    {
        this.schemaFile = schemaFile;
        this.schemaContent = schemaContent;
        this.regex = Schema.getRegex(name);
        this.jsonSchema = jsonSchema;
        this.tsch = tsch;
    }

    public getSchemaFile()
    {
        return this.schemaFile;
    }
    public getSchemaContent()
    {
        return this.schemaContent;
    }
    public getRegex()
    {
        return this.regex;
    }

    public validate(value: any)
    {
        if (!!this.tsch) return this.tsch.validate(value);
        if (!!this.jsonSchema)
        {
            const ajv = new Ajv();
            const validate = ajv.compile(this.jsonSchema);
            const valid = validate(value);
            const errors = valid ? [] : (validate.errors ?? []).map(v => `${v.dataPath} ${v.message ?? ""}`);
            return { valid: !!valid, errors };
        }
        return { valid: true, errors: [] };
    }
    public getJsonSchema()
    {
        if (!!this.tsch) return this.tsch.getJsonSchemaProperty();
        return this.jsonSchema;
    }

    public static parseSchema(file: string, content: string, result?: Schema[])
    {
        if (!result) result = [];
        const addJsonSchema = (name: string, jsonSchema: JsonSchemaProperty) => Schema.addJsonSchema(result ?? [], file, content, name, jsonSchema);
        const addTsch = (name: string, tsch: TschType<any, any>) => Schema.addTsch(result ?? [], file, content, name, tsch);
        const tsch = tsch_global;

        try
        {
            "use strict";
            eval(content);
        }
        catch (e)
        {
            console.warn(`Exception during ${file}`, e);
        }
        return result;
    }

    private static getRegex(name: string): RegExp
    {
        return new RegExp("^" + name.split("*")
            .map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
            .join(".*") + "$");
    }
    private static addJsonSchema(schemas: Schema[], schemaFile: string, content: string, name: string, jsonSchema: JsonSchemaProperty)
    {
        schemas.push(new Schema(schemaFile, content, name, jsonSchema));
    }
    private static addTsch(schemas: Schema[], schemaFile: string, content: string, name: string, tsch: TschType<any, any>)
    {
        schemas.push(new Schema(schemaFile, content, name, undefined, tsch));
    }
}