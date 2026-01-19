import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const corpId = process.env.WECOM_CORP_ID;
  const corpSecret = process.env.WECOM_AGENT_SECRET;
  const agentId = process.env.WECOM_AGENT_ID;

  if (!corpId || !corpSecret || !agentId) {
    return new NextResponse("WeCom not configured", { status: 500 });
  }

  const tokenResponse = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(
      corpId
    )}&corpsecret=${encodeURIComponent(corpSecret)}`
  );
  const tokenJson = (await tokenResponse.json()) as {
    errcode: number;
    errmsg: string;
    access_token?: string;
  };
  if (!tokenResponse.ok || tokenJson.errcode !== 0 || !tokenJson.access_token) {
    return NextResponse.json(tokenJson, { status: 502 });
  }

  const sendResponse = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${encodeURIComponent(
      tokenJson.access_token
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        touser: "jzwang",
        msgtype: "text",
        agentid: Number(agentId),
        text: {
          content: "123"
        },
        safe: 0
      })
    }
  );
  const sendJson = (await sendResponse.json()) as {
    errcode: number;
    errmsg: string;
  };
  if (!sendResponse.ok || sendJson.errcode !== 0) {
    return NextResponse.json(sendJson, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

