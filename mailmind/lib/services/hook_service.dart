import 'dart:async';
import 'package:quick_actions/quick_actions.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// 앱 진입 훅 3종: 롱프레스 숏컷 / 공유 인텐트 / 알림 AI 답장 버튼
class HookService {
  static final HookService _instance = HookService._internal();
  factory HookService() => _instance;
  HookService._internal();

  static const _channel = AndroidNotificationChannel(
    'mailmind_mail',
    'MailMind Mail',
    description: 'New mail notifications with AI reply action',
    importance: Importance.high,
  );

  final _localNotif = FlutterLocalNotificationsPlugin();
  StreamSubscription? _shareSub;

  // 외부에서 등록하는 콜백들
  void Function(String shortcutType)? onQuickAction;
  void Function(String sharedText)? onSharedText;
  void Function(String? messageId)? onNotifAiReply;

  // ── 1. Quick Actions (앱 아이콘 롱프레스) ────────────────────────────────

  void setupQuickActions() {
    const quickActions = QuickActions();
    quickActions.initialize((type) => onQuickAction?.call(type));
    quickActions.setShortcutItems([
      const ShortcutItem(
        type: 'action_compose',
        localizedTitle: 'AI 작성',
      ),
      const ShortcutItem(
        type: 'action_inbox',
        localizedTitle: '받은편지함',
      ),
    ]);
  }

  // ── 2. Share Intent (다른 앱에서 공유) ───────────────────────────────────

  void setupShareIntent() {
    final intent = ReceiveSharingIntent.instance;

    // 앱이 이미 열려있을 때 들어오는 공유
    _shareSub = intent.getMediaStream().listen(
      (List<SharedMediaFile> files) {
        final text = files
            .where((f) => f.type == SharedMediaType.text)
            .map((f) => f.path)
            .join('');
        if (text.isNotEmpty) onSharedText?.call(text);
      },
      onError: (_) {},
    );

    // 앱이 닫혀있다가 공유로 열렸을 때
    intent.getInitialMedia().then((List<SharedMediaFile> files) {
      final text = files
          .where((f) => f.type == SharedMediaType.text)
          .map((f) => f.path)
          .join('');
      if (text.isNotEmpty) onSharedText?.call(text);
      intent.reset();
    });
  }

  void disposeShareIntent() => _shareSub?.cancel();

  // ── 3. 알림 AI 답장 버튼 (flutter_local_notifications) ───────────────────

  Future<void> setupLocalNotifications() async {
    await _localNotif.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    await _localNotif.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: _onNotifResponse,
      onDidReceiveBackgroundNotificationResponse: _onNotifResponseBackground,
    );
  }

  /// FCM 포그라운드 메시지 → AI 답장 버튼이 있는 로컬 알림으로 표시
  Future<void> showMailNotification(RemoteMessage msg) async {
    final title = msg.notification?.title ?? msg.data['subject'] ?? '새 메일';
    final body = msg.notification?.body ?? msg.data['from'] ?? '';
    final messageId = msg.data['messageId'] as String?;

    const androidDetails = AndroidNotificationDetails(
      'mailmind_mail',
      'MailMind Mail',
      channelDescription: 'New mail notifications with AI reply action',
      importance: Importance.high,
      priority: Priority.high,
      actions: [
        AndroidNotificationAction(
          'ai_reply',
          'AI 답장',
          showsUserInterface: true,
          cancelNotification: true,
        ),
      ],
    );
    const iosDetails = DarwinNotificationDetails(
      categoryIdentifier: 'mail_category',
    );

    await _localNotif.show(
      msg.hashCode,
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: messageId,
    );
  }

  void _onNotifResponse(NotificationResponse response) {
    if (response.actionId == 'ai_reply' || response.notificationResponseType ==
        NotificationResponseType.selectedNotification) {
      onNotifAiReply?.call(response.payload);
    }
  }

  @pragma('vm:entry-point')
  static void _onNotifResponseBackground(NotificationResponse response) {
    // 백그라운드에서 탭 — 앱이 열리면 onNotifAiReply 콜백이 처리
  }
}
