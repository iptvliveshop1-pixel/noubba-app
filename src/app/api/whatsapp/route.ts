import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Grab the data sent from the Dashboard's "🔔 Alerter" button
    const body = await request.json();
    
    // Note: The dashboard sends 'name', so we map it to customerName
    const { phone, name: customerName, salonName = "Noubba" } = body;

    // 2. Pull your secure credentials from the .env.local vault
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing credentials in .env.local");
      return NextResponse.json(
        { error: "Missing WhatsApp API credentials" },
        { status: 500 }
      );
    }

    // 3. Format the Moroccan phone number properly for Meta (Add 212, remove 0)
    let cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '212' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('212')) {
      cleanPhone = '212' + cleanPhone;
    }

    // 4. Build the payload matching your approved 2-variable template
    const payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: "noubba_turn_alert",
        language: {
          code: "fr"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: customerName // This dynamically fills {{1}}
              },
              {
                type: "text",
                text: salonName    // This dynamically fills {{2}}
              }
            ]
          }
        ]
      }
    };

    // 5. Fire the payload to Meta's Production Cloud API (v19.0)
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    // 6. Handle any errors from Meta
    if (!response.ok) {
      console.error("Meta API Error:", data);
      return NextResponse.json(
        { error: "Failed to send WhatsApp message", details: data },
        { status: response.status }
      );
    }

    // 7. Success!
    return NextResponse.json({ success: true, messageId: data.messages[0].id });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json(
      { error: "Something went wrong processing the request" },
      { status: 500 }
    );
  }
}