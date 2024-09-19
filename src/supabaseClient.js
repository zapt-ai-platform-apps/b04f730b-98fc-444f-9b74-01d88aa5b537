```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createEvent(eventType, dataInput) {
  const { data: triggerResponse, error } = await supabase.functions.invoke('create-frontend-event', {
    body: JSON.stringify({ event_type: eventType, data_input: dataInput, app_id: import.meta.env.VITE_PUBLIC_APP_ID }),
  });

  if (error || !triggerResponse || !triggerResponse.event_id) {
    console.error('Error triggering event:', error || 'No event ID returned');
    return null;
  }
  const eventId = triggerResponse.event_id;

  const channel = supabase.channel(`event-response-${eventId}`);

  let subscriptionActive = false;
  const subscriptionPromise = new Promise((resolve) => {
    channel
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'frontend_events',
        filter: `id=eq.${eventId} AND status=eq.complete`
      }, (payload) => {
        subscriptionActive = true;
        resolve(payload.new.response);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscriptionActive = true;
        }
      });
  });

  const completionCheckPromise = supabase
    .from('frontend_events')
    .select('response')
    .eq('id', eventId)
    .eq('status', 'COMPLETE')
    .single();

  try {
    const result = await Promise.race([
      subscriptionPromise,
      completionCheckPromise.then(({ data, error }) => {
        if (error) throw error;
        return data.response;
      }),
    ]);

    if (subscriptionActive) {
      await supabase.removeChannel(channel);
    }
    return result;
  } catch (error) {
    console.error('Error waiting for event completion:', error);
    if (subscriptionActive) {
      await supabase.removeChannel(channel);
    }
    return null;
  }
}
```