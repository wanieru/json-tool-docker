import * as express from 'express';
import hat from 'hat';
import { SchemaUtils } from './SchemaUtils';
import { Schema } from './www/Schema';

export class Server
{
    public express: express.Express = express.default();
    public constructor(port: number)
    {
        this.express.use(express.json());
        this.express.listen(port, () => console.log(`Listening on port ${port}`));
        this.express.post('/api', (req, res) => this.api(req, res));
        this.express.use('/', express.static("www"));
        this.setupErrorHandlers();
    }
    private setupErrorHandlers()
    {
        this.express.use(function errorHandler(err: any, req: any, res: express.Response, next: any)
        {
            const code = hat();
            console.error(code, "\n", err);
            res.status(400).send({ "message": `Something went wrong! Error code ${code}` });
        });
    }
    private async api(req: express.Request, res: express.Response)
    {
        const json = req.body;
        const no = (json: any = {}) => { res.status(400); res.json(json) };
        const ok = (json: any = {}) => { res.status(200); res.json(json) };

        if (!json.command)
            return no();

        if (json.command === "list")
        {
            const files = {} as Record<string, string[]>;
            const schemas = await SchemaUtils.getSchemas();
            for (const schema of schemas)
            {
                const arr = [] as string[];
                files[schema.getSchemaFile()] = arr;
                const jsons = await SchemaUtils.getJsons(schema);
                for (const json of jsons)
                {
                    arr.push(json);
                }
            }
            return ok({ schemas: files });
        }
        if (json.command === "load")
        {
            if (typeof json.schema !== "string") return no();
            if (typeof json.json !== "string") return no();
            const schemas = await SchemaUtils.getSchemas([json.schema]);
            if (schemas.length < 1) return no();
            const schema = schemas[0];
            if (await SchemaUtils.hasJson(schema, json.json)) return no();
            const value = await SchemaUtils.getJson(schema, json.json);
            return ok({ schemaContent: schema.getSchemaContent(), value: value });
        }
        if (json.command === "save")
        {
            if (typeof json.schema !== "string") return no();
            if (typeof json.json !== "string") return no();
            if (typeof json.value !== "undefined") return no();
            const schemas = await SchemaUtils.getSchemas([json.schema]);
            if (schemas.length < 1) return no();
            const schema = schemas[0];
            if (await SchemaUtils.hasJson(schema, json.json)) return no();
            if (!schema.validate(json.value).valid) no();
            await SchemaUtils.setJson(schema, json.json, json.value);
            return ok();
        }

        return no();
    }
}