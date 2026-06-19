import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// 1. Configure Web Push with your keys
webpush.setVapidDetails(
  'mailto:contact@noubba.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// 🔥 2. CHANGED: Use the Service Role Key to bypass RLS!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { customerId, title, body } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // 3. Find the customer in the database (Now as Admin)
    const { data: customer, error } = await supabase
      .from('customers')
      .select('push_subscription')
      .eq('id', customerId)
      .single();

    if (error || !customer?.push_subscription) {
      console.log('No push subscription found for this customer.', error);
      return NextResponse.json({ error: 'No push subscription found' }, { status: 404 });
    }

    // 4. Send the Native Notification!
    const subscription = customer.push_subscription;
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body })
    );

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}