import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../supabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const challengeId = formData.get('challenge_id') as string;
    const userId = formData.get('user_id') as string;

    if (!file || !challengeId || !userId) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }

    // Проверяем размер файла (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой (макс 10MB)' }, { status: 400 });
    }

    // Проверяем тип файла
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Неподдерживаемый тип файла' }, { status: 400 });
    }

    // Генерируем уникальное имя файла
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = file.name.split('.').pop();
    const fileName = `challenges/${userId}/${challengeId}/${timestamp}.${extension}`;

    // Загружаем в Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('challenge-proofs')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
    }

    // Получаем публичный URL
    const { data: urlData } = supabaseServer.storage
      .from('challenge-proofs')
      .getPublicUrl(fileName);

    // Получаем информацию о челлендже
    const { data: challengeData, error: challengeError } = await supabaseServer
      .from('challenges')
      .select('coins_reward, name')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challengeData) {
      return NextResponse.json({ error: 'Челлендж не найден' }, { status: 404 });
    }

    // Сохраняем артефакт в базу данных
    const { data: proofData, error: proofError } = await supabaseServer
      .from('habit_proofs')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        status: 'approved', // Автоматически одобряем для демо
        coins_earned: challengeData.coins_reward,
        xp_earned: Math.floor(challengeData.coins_reward / 2) // XP = половина от coins
      })
      .select()
      .single();

    if (proofError) {
      console.error('Proof save error:', proofError);
      return NextResponse.json({ error: 'Ошибка сохранения в базу данных' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      proof: proofData,
      challenge_name: challengeData.name,
      coins_earned: challengeData.coins_reward,
      message: `Челлендж "${challengeData.name}" выполнен! +${challengeData.coins_reward} coins`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
} 