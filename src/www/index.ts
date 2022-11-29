import { Schema } from "./Schema";
import { ServerUtils } from "./ServerUtils";


export class Client
{
    private schemas: Record<string, string[]> = {};
    private select: HTMLSelectElement;
    public constructor()
    {
        const menu = document.querySelector("#menu") as HTMLDivElement;
        this.select = document.createElement("select");
        menu.appendChild(this.select);
        this.loadFiles();

    }
    private async loadFiles()
    {
        const result = await ServerUtils.list();
        if (result.status !== 200) return;
        console.log(result);
        this.schemas = result.body.schemas;
        this.select.innerHTML = "";
        for (const files of Object.values(this.schemas))
        {
            for (const file of files)
            {
                const option = document.createElement("option");
                option.innerText = file;
                this.select.appendChild(option);
            }
        }
    }
}
new Client();