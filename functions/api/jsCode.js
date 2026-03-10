import {buildRateConfigs} from "../utils/buildRateConfigs.js"

export async function onRequest({request}) {
    try {
        const params = new URL(request.url).searchParams

        const type = params.get("type")
        const profitParam = params.get("profit")
        const dateParam = params.get("date")

        if (!["xy", "xyn"].includes(type)) return new Response("type 参数错误", {status: 400})

        // 读取 xyWeb (动态域名)
        const hyper = await fetch(new URL("/config/hyperlink.json", request.url));
        const hyperJson = await hyper.json();
        const xyWeb = hyperJson.xyWeb;

        // 构建折扣接口
        let discountUrl = new URL("/api/discount", request.url).toString()
        // 折扣接口查询参数
        const queryParams = new URLSearchParams()
        if (profitParam) queryParams.set("profit", profitParam)
        if (dateParam) queryParams.set("date", dateParam)
        const qs = queryParams.toString()
        if (qs) discountUrl += `?${qs}`

        // 请求折扣
        const discountResp = await fetch(discountUrl)
        if (!discountResp.ok) throw new Error("折扣接口请求失败")

        const discountData = await discountResp.json()
        if (discountData.error) throw new Error(discountData.error)

        // 从同域获取折扣数据  日期 星悦(老/新)
        const date = discountData.date
        const rateConfigs = buildRateConfigs(discountData[type])

        const jsCode =
            `fetch("${xyWeb}/api/v1/system/qr-dealers/reckon/configs",{method:"POST",body:JSON.stringify({id:null,date:"${date}",rateConfigs:${JSON.stringify(rateConfigs)}})})
.then(r=>r.json())
.then(d=>console.log(d))
.catch(e=>console.error("请求失败:",e));`

        // 返回纯文本
        return new Response(jsCode, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            }
        })
    } catch (err) {
        return new Response("生成失败: " + err.message, {status: 500})
    }
}
