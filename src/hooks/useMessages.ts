'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { ShopFloorMessage } from '@/lib/types';

export function useMessages(lineId: string | null) {
  const [messages, setMessages] = useState<ShopFloorMessage[]>([]);

  const fetchMessages = useCallback(async () => {
    let query = supabase
      .from('shop_floor_messages')
      .select('*')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    const { data } = await query;
    if (!data) { setMessages([]); return; }

    const filtered = data.filter((m: ShopFloorMessage) => {
      if (m.target === 'all' || m.target === 'trs') return true;
      if (m.target_line_id && m.target_line_id === lineId) return true;
      return false;
    });
    setMessages(filtered);
  }, [lineId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel('shop-floor-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shop_floor_messages',
      }, () => { fetchMessages(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  async function markAsRead(messageId: string) {
    await supabase
      .from('shop_floor_messages')
      .update({ is_read: true })
      .eq('id', messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  return { messages, markAsRead };
}
