import { Schema } from "./www/Schema";
import { Server } from "./Server";
import { FsWrap } from "./Utils/FsWrap";

async function run()
{
    const server = new Server(parseInt(process.env["PORT"] ?? "") || 5000);
}
run();