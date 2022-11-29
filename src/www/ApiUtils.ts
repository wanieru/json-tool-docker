export class ApiUtils
{
    public static async run<T>(url: string, json: any): Promise<{ status: number, body: T & { msg?: string } }>
    {
        const rawResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(json)
        });
        const body = await rawResponse.json();
        const status = rawResponse.status;
        return { status, body };
    }
}