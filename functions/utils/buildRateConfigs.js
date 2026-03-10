export function buildRateConfigs(data) {
    const timeKeys = Object.keys(data).sort();

    // speed_mode 映射表
    const modeMap = {
        "普通": "qq",
        "加速": "fast",
        "超速": "sup",
        "极速": "very",
        "秒拉": "ml",
        "怪额": "odd",
        "超怪": "cg",
        "钱包直拉": "zl",
        "微信单端": "wx",
        "微信通额": "bz",
        "微信固额": "ge",
        "微信小额": "xe",
        "微信点额": "de",
        "微信速额": "se",
        "扫码通额": "qr",
        "扫码固额": "sg",
        "扫码小额": "sx"
    };

    // 生成时间分段
    const timeRanges = [];
    for (let i = 0; i < timeKeys.length; i++) {
        const start = timeKeys[i];
        const end = i < timeKeys.length - 1 ? timeKeys[i + 1] : null;
        const startFull = `${start}:00`;
        const endFull = end
            ? (() => {
                const [eh, em] = end.split(":").map(Number);
                // 若下一段起始分钟是 00，则回到上一小时 59 分
                const hour = em === 0 ? eh - 1 : eh;
                const minute = em === 0 ? 59 : em - 1;
                return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:59`;
            })()
            : "23:59:59";
        timeRanges.push({start_time: startFull, end_time: endFull, rates: data[start]});
    }

    // 返回rateConfigs
    return Object.entries(modeMap)
        .filter(([name]) => timeRanges.some(t => t.rates && t.rates[name] != null))
        .map(([name, speed_mode]) => ({
            speed_mode,
            time_rates: timeRanges
                .filter(t => t.rates && t.rates[name] != null)
                .map(t => ({
                    start_time: t.start_time,
                    end_time: t.end_time,
                    rate: t.rates[name]
                }))
        }));
}
