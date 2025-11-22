// app/api/call-agent/route.ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
    const { clientName, reason } = await request.json();

    console.log("--- DEBUGGING KEYS ---");
    console.log("SID:", process.env.TWILIO_ACCOUNT_SID ? "Exists" : "Missing");
    console.log("Token:", process.env.TWILIO_AUTH_TOKEN ? "Exists" : "Missing");
    console.log("----------------------");


    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = "+1 463 278 7717";
    const toNumber = '+41789259704';

    if (!accountSid || !authToken || !fromNumber) {
        return NextResponse.json({ error: 'Missing Twilio Keys' }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    // TwiML: This XML tells Twilio what to say when you pick up
    const twiml = `
        <Response>
            <Say voice="alice">
                Incoming escalation from Sixt Virtual Agent. 
                Client ${clientName || 'Unknown'} is requesting assistance. 
                Reason: ${reason || 'General Inquiry'}.
                Connecting you now.
            </Say>
        </Response>
    `;

    try {
        const call = await client.calls.create({
            twiml: twiml,
            to: toNumber,
            from: fromNumber,
        });

        return NextResponse.json({ success: true, callSid: call.sid });
    } catch (error: any) {
        console.error('Twilio Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}