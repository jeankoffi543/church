import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors } from '../theme';
import type { DonationInit } from '../types';

/**
 * Paystack checkout in a WebView (CHR-189). We load Paystack's inline.js with the
 * params the backend returned and relay its callback/onClose back to RN via
 * `postMessage`. Amount goes to Paystack in the currency subunit (×100).
 */
function checkoutHtml(init: DonationInit): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f6f4ef">
<script src="https://js.paystack.co/v1/inline.js"></script>
<script>
  function post(o){ if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
  try {
    var handler = PaystackPop.setup({
      key: ${JSON.stringify(init.public_key)},
      email: ${JSON.stringify(init.email)},
      amount: ${Math.round(init.amount * 100)},
      currency: ${JSON.stringify(init.currency)},
      ref: ${JSON.stringify(init.reference)},
      callback: function(response){ post({ event: 'success', reference: response.reference }); },
      onClose: function(){ post({ event: 'close' }); }
    });
    handler.openIframe();
  } catch (e) { post({ event: 'error', message: String(e) }); }
</script>
</body></html>`;
}

export function PaystackCheckout({
  init,
  visible,
  onSuccess,
  onCancel,
}: {
  init: DonationInit | null;
  visible: boolean;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}) {
  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { event: string; reference?: string };
      if (data.event === 'success' && data.reference) {
        onSuccess(data.reference);
      } else {
        onCancel();
      }
    } catch {
      onCancel();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>Paiement sécurisé</Text>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Text style={styles.close}>Annuler</Text>
          </Pressable>
        </View>
        {init && (
          <WebView
            source={{ html: checkoutHtml(init) }}
            onMessage={onMessage}
            javaScriptEnabled
            originWhitelist={['*']}
            startInLoadingState
            renderLoading={() => <ActivityIndicator style={styles.loader} color={colors.indigo} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.ink,
  },
  barTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  close: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  loader: { flex: 1 },
});
