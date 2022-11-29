import { Server } from "./Server";

async function run()
{
    const server = new Server(parseInt(process.env["PORT"] ?? "") || 5000);
}
run();