export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const ck = body.ck;
        if (!ck) return new Response(JSON.stringify({error: "missing ck"}), {status: 400});

        const params = new URL(ck).searchParams;
        const sessionid = params.get("sessionid");
        const sessiontype = params.get("sessiontype");
        const openid = params.get("openid");
        const openkey = params.get("openkey");
        const uin = params.get("_") || params.get("uin");

        if (!sessionid || !sessiontype || !openid || !openkey) {
            return new Response(JSON.stringify({error: "missing required params"}), {status: 400});
        }

        let invoiceUrl =
            "https://pay.qq.com/h5/invoice/index.shtml?wxAppid2=wx951bdcac522929b6&&" +
            `sessionid=${sessionid}&sessiontype=${sessiontype}`;
        if (uin) {
            invoiceUrl += `&uin=${uin}`;
        }
        invoiceUrl += `&openid=${openid}&openkey=${openkey}#/`;

        return new Response(
            JSON.stringify({url: invoiceUrl}),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            }
        );
    } catch (err) {
        return new Response(JSON.stringify({error: "server error"}), {status: 500});
    }
}
