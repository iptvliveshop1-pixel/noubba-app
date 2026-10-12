import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure Web Push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@noubba.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { customerId, title, body } = await req.json();

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const cleanTitle = (title || "C'est votre tour !").trim().slice(0, 100);
    const cleanBody = (body || "Votre place est prête au salon.").trim().slice(0, 250);

    // Verify customer actually has an active or frozen ticket in the queue
    const { data: activeTicket } = await supabase
      .from('queue')
      .select('id')
      .eq('customer_id', customerId)
      .in('status', ['waiting', 'frozen'])
      .limit(1)
      .maybeSingle();

    if (!activeTicket) {
      return NextResponse.json(
        { error: 'Le client n\'a pas de ticket actif dans la file' },
        { status: 403 }
      );
    }

    // Retrieve push subscription for the customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('push_subscription')
      .eq('id', customerId)
      .single();

    if (customerError || !customer?.push_subscription) {
      return NextResponse.json({ error: 'Aucun abonnement push trouvé' }, { status: 404 });
    }

    // Send native push notification
    try {
      await webpush.sendNotification(
        customer.push_subscription,
        JSON.stringify({ title: cleanTitle, body: cleanBody })
      );
    } catch (pushErr: any) {
      // If subscription is expired or revoked (410 Gone / 404 Not Found), clean it up
      if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
        await supabase
          .from('customers')
          .update({ push_subscription: null })
          .eq('id', customerId);
      }
      return NextResponse.json(
        { error: 'Abonnement push expiré ou inaccessible' },
        { status: 410 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json({ error: 'Échec de l\'envoi de la notification' }, { status: 500 });
  }
}