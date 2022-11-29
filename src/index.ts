import { Schema } from "./Schema";
import { Server } from "./Server";
import { FsWrap } from "./Utils/FsWrap";

async function run()
{
    Schema.getSchemas().then(s => console.log(s));
    const server = new Server(parseInt(process.env["PORT"] ?? "") || 5000);
}
run();