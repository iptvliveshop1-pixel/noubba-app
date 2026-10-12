import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { staffId, pin } = await req.json();

    if (!staffId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Identifiant du staff et PIN requis.' },
        { status: 400 }
      );
    }

    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'Le code PIN doit comporter 4 chiffres.' },
        { status: 400 }
      );
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, name, is_available, access_pin')
      .eq('id', staffId)
      .single();

    if (error || !staff) {
      return NextResponse.json(
        { success: false, error: 'Coiffeur introuvable.' },
        { status: 404 }
      );
    }

    if (staff.access_pin !== pin) {
      return NextResponse.json(
        { success: false, error: 'PIN incorrect.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        is_available: staff.is_available,
      },
    });
  } catch (error) {
    console.error('Erreur vérification PIN staff:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}