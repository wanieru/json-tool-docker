import { Schema } from "./Schema";
import { ServerUtils } from "./ServerUtils";
import { JsonTool } from "json-tool/js/JsonTool";


export class Client
{
    private schemas: Record<string, string[]> = {};
    private select: HTMLSelectElement;
    private buttons: HTMLDivElement;
    private jsonToolRoot: HTMLDivElement;
    private schema: Schema | null = null;
    private jsonTool: JsonTool | null = null;
    private schemaFile: string | null = null;
    private jsonFile: string | null = null;
    public constructor()
    {
        const menu = document.querySelector("#menu") as HTMLDivElement;
        this.jsonToolRoot = document.querySelector("#json-tool") as HTMLDivElement;
        this.select = document.createElement("select");
        menu.appendChild(this.select);
        this.select.onchange = () => this.onFileChange();

        this.buttons = document.createElement("div");
        const save = document.createElement("button");
        save.innerText = "Save changes";
        save.onclick = () => this.save();
        const close = document.createElement("button");
        close.innerText = "Discard changes";
        close.onclick = () => this.close();
        this.buttons.appendChild(save);
        this.buttons.appendChild(close);
        menu.appendChild(this.buttons);

        this.setJsonToolVisible(false);
    }
    private close()
    {
        this.setJsonToolVisible(false);
    }
    private setJsonToolVisible(visible: boolean)
    {
        this.select.style.display = !visible ? "" : "none";
        this.buttons.style.display = visible ? "" : "none";
        if (!visible)
        {
            this.jsonTool?.hide();
            this.loadFiles();
        }
    }
    private async onFileChange()
    {
        const value = this.select.value;
        const split = value.split("@");
        const schema = split[0];
        const json = split[1];
        this.loadFile(schema, json);
    }
    private async loadFile(schema: string, json: string)
    {
        const result = await ServerUtils.load(schema, json);
        if (result.body.schema)
        {
            this.schema = result.body.schema;
            const jsonSchema = result.body.schema.getJsonSchema();
            if (jsonSchema)
            {
                this.schemaFile = schema;
                this.jsonFile = json;
                this.setJsonToolVisible(true);
                this.jsonTool = new JsonTool(this.jsonToolRoot);
                this.jsonTool.load(jsonSchema, result.body.value, v => result.body.schema.validate(v));
            }
        }
    }
    private async save()
    {
        if (!this.schema) return;
        if (!this.jsonTool) return;
        if (!this.jsonFile) return;
        if (!this.schemaFile) return;
        const value = this.jsonTool.getValue();
        if (!this.schema.validate(value).valid) return alert("Please fix all errors before saving!");
        const result = await ServerUtils.save(this.schemaFile, this.jsonFile, value);
        if (result.status === 200) 
        {
            this.setJsonToolVisible(false);
        }
        else
        {
            alert(`Failed to save: ${result.body.msg}`);
        }
    }
    private async loadFiles()
    {
        const result = await ServerUtils.list();
        if (result.status !== 200) return;
        this.schemas = result.body.schemas;
        this.select.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.innerText = "==Choose file==";
        this.select.appendChild(defaultOption);

        for (const schema in this.schemas)
        {
            for (const file of this.schemas[schema])
            {
                const option = document.createElement("option");
                option.value = `${schema}@${file}`;
                option.innerText = file;
                this.select.appendChild(option);
            }
        }
    }
}
new Client();