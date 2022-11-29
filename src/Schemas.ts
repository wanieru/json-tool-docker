import { JsonSchemaProperty } from "tsch/dist/JsonSchemaProperty";
import { TschType } from "tsch/dist/TschType";

export class Schemas
{
    private static schemas: { jsonSchema?: JsonSchemaProperty, tsch?: TschType<any, any> }[] | undefined = undefined;
    public static load()
    {
        if (!!Schemas.schemas) return;
        Schemas.schemas = [];

    }
}