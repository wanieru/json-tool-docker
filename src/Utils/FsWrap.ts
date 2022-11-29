import * as fs from "fs/promises";
import * as fssync from "fs";
import path from "path";
export class FsWrap
{
    public static async getAllFilesInDir(dir: string, regex?: RegExp, result?: string[]): Promise<string[]>
    {
        if (!result) result = [];

        const subfiles = await fs.readdir(dir);
        for (const subfile of subfiles)
        {
            const fullPath = path.join(dir, subfile);
            const stat = await FsWrap.getStat(fullPath);
            if (stat.isDirectory())
            {
                await this.getAllFilesInDir(fullPath, regex, result);
            }
            else
            {
                if (regex && !regex.test(subfile)) continue;
                result.push(fullPath);
            }
        }

        return result;
    }
    public static async loadFile(file: string): Promise<string>
    {
        const buffer = await fs.readFile(file);
        return buffer.toString();
    }
    public static async saveFile(file: string, data: string): Promise<void>
    {
        const dir = path.dirname(file);
        if (!fssync.existsSync(dir))
            await fs.mkdir(dir);
        if (fssync.existsSync(file))
            await fs.rm(file);
        await fs.writeFile(file, data);
    }
    public static async getStat(file: string)
    {
        return fs.stat(file);
    }
}