const ADMIN_PHONE = '962781254771';

export const sendDepositRequestToWhatsApp = (amount: number, userEmail: string) => {
  const message = `مرحباً أدمن، أود إيداع ${amount} دينار في محفظتي في نشامى بلس. بريدي الإلكتروني هو: ${userEmail}`;
  const encodedMessage = encodeURIComponent(message);
  window.location.href = `https://wa.me/${ADMIN_PHONE}?text=${encodedMessage}`;
};

export const sendOrderNotificationToWhatsApp = (serviceName: string, playerAppId: string, userEmail: string) => {
  const message = `طلب جديد على نشامى بلس!\nالخدمة: ${serviceName}\nمعرف اللاعب: ${playerAppId}\nالمستخدم: ${userEmail}`;
  const encodedMessage = encodeURIComponent(message);
  window.location.href = `https://wa.me/${ADMIN_PHONE}?text=${encodedMessage}`;
};
