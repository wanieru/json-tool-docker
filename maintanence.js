const http = require('http');
const { exec } = require("child_process");

const port = 80;

const start = new Date().getTime();

const server = http.createServer((req, res) =>
{
    console.log('Request for ' + req.url + ' by method ' + req.method);

    if (req.method == 'GET')
    {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        const timePassed = (new Date().getTime() - start) / 1000;
        const secs = Math.floor(timePassed % 60).toString().padStart(2, "0");
        const minutes = Math.floor(timePassed / 60).toString().padStart(2, "0");
        res.write(`<h1 style="text-align: center; font-family: sans-serif; margin-top: 40vh;">This server is currently undergoing maintanence. It will be back soon!<br>${minutes}:${secs}</h1>`);
    }
    else if (req.method == "OPTIONS")
    {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
    }
    else
    {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.write(JSON.stringify({ message: "Server is startnig..." }));
    }
    res.end();
});


server.listen(port, () =>
{
    console.log(`Server running at port ${port}`);
});

const arg = process.argv.slice(2).join(" ");
if (arg)
{
    console.log(`Executing command: ${arg}`);
    exec(arg, (error, stdout, stderr) =>
    {
        if (error)
        {
            console.log(`error: ${error.message}`);
        }
        if (stderr)
        {
            console.log(`stderr: ${stderr}`);
        }
        else
        {
            console.log(`stdout: ${stdout}`);
        }

        process.exit();
    });
}
else
{
    console.log("No arg passed, will keep running maintanence page.");
}