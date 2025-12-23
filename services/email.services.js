import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Usar API HTTP de Resend (puerto 443, nunca bloqueado)
const resend = new Resend(process.env.RESEND_API_KEY || process.env.SMTP_PASS);

// Dominio verificado en Resend
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@leonix.net.ar';
const FROM_NAME = process.env.FROM_NAME || 'Leonix';

console.log('📧 Configuración Resend API:', {
  apiKey: (process.env.RESEND_API_KEY || process.env.SMTP_PASS) ? '✅ Configurado' : '❌ No configurado',
  from: `${FROM_NAME} <${FROM_EMAIL}>`,
});

// Colores de la marca Leonix
const colors = {
  primary: '#00a86b',        // Verde principal
  primaryDark: '#007a4d',    // Verde oscuro para el código
  primaryHover: '#00995a',   // Verde hover
  dark: '#1A1A1A',           // Negro para texto
  text: '#4A4A4A',
  textLight: '#9B9B9B',
  background: '#f9f9f9',
  white: '#ffffff',
  warning: '#EF4444',
};

// Estilos comunes para los mails (Inline CSS para máxima compatibilidad)
const emailStyles = {
  container: `font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${colors.background};`,
  header: `text-align: center; padding: 30px 20px 10px 20px;`,
  logoText: `font-family: 'Montserrat', 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: ${colors.dark}; letter-spacing: -0.5px; margin: 0; text-decoration: none;`,
  card: `background-color: ${colors.white}; padding: 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);`,
  title: `font-size: 24px; font-weight: 700; color: ${colors.dark}; margin-bottom: 16px; text-align: center;`,
  text: `font-size: 16px; line-height: 1.6; color: ${colors.text}; margin-bottom: 24px; text-align: center;`,
  codeContainer: `background: ${colors.primaryDark}; padding: 24px; text-align: center; border-radius: 12px; margin: 30px 0;`,
  codeText: `font-size: 36px; font-weight: 800; letter-spacing: 8px; color: ${colors.white}; margin: 0;`,
  footer: `text-align: center; padding: 30px; font-size: 13px; color: ${colors.textLight}; line-height: 1.5;`,
  button: `display: inline-block; background-color: ${colors.primary}; color: ${colors.white}; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; margin-top: 10px;`,
  credentialsBox: `background-color: #F8FAFC; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0; margin: 24px 0;`,
  smallText: `font-size: 14px; color: #888; text-align: center; margin-top: 20px;`,
};

// Header simple: Solo "Leonix" en negro centrado
const emailHeader = `
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet">
  <div style="${emailStyles.header}">
    <span style="${emailStyles.logoText}">Leonix</span>
  </div>
`;

/**
 * Envía un email de verificación con un diseño premium.
 */
export async function sendVerificationEmail(email, code) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `${code} es tu código de verificación de Leonix`,
      html: `
      <div style="${emailStyles.container}">
        <div style="padding: 20px;">
          ${emailHeader}
          
          <div style="${emailStyles.card}">
            <h1 style="${emailStyles.title}">Verifica tu cuenta</h1>
            <p style="${emailStyles.text}">
              ¡Hola! Gracias por elegir Leonix. Para completar tu registro y empezar a gestionar tus mantenimientos, ingresa el siguiente código de seguridad:
            </p>
            
            <div style="${emailStyles.codeContainer}">
              <h2 style="${emailStyles.codeText}">${code}</h2>
            </div>
            
            <p style="${emailStyles.smallText}">
              Este código es válido por 15 minutos. Por tu seguridad, no compartas este código con nadie.
            </p>
          </div>
          
          <div style="${emailStyles.footer}">
            <p>© ${new Date().getFullYear()} Leonix. Todos los derechos reservados.</p>
            <p>Has recibido este correo porque se solicitó un registro en Leonix. Si no fuiste tú, puedes ignorar este mensaje de forma segura.</p>
          </div>
        </div>
      </div>
    `,
    });

    if (error) {
      console.error('❌ Error enviando email de verificación:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email de verificación enviado:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error enviando email de verificación:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía un email con código de seguridad para cambio de contraseña.
 */
export async function sendPasswordChangeEmail(email, code) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `${code} es tu código de seguridad para cambiar la contraseña`,
      html: `
      <div style="${emailStyles.container}">
        <div style="padding: 20px;">
          ${emailHeader}
          
          <div style="${emailStyles.card}">
            <h1 style="${emailStyles.title}">Código de Seguridad</h1>
            <p style="${emailStyles.text}">
              Has solicitado cambiar tu contraseña en Leonix. Por seguridad, ingresa el siguiente código para confirmar que eres el propietario de la cuenta:
            </p>
            
            <div style="${emailStyles.codeContainer}">
              <h2 style="${emailStyles.codeText}">${code}</h2>
            </div>
            
            <p style="${emailStyles.smallText}">
              Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña actual permanecerá igual.
            </p>
          </div>
          
          <div style="${emailStyles.footer}">
            <p>© ${new Date().getFullYear()} Leonix. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    `,
    });

    if (error) {
      console.error('❌ Error enviando email de cambio de contraseña:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error enviando email de cambio de contraseña:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía un email de bienvenida con diseño premium.
 */
export async function sendWelcomeEmail(email, userName, tempPassword) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: '¡Bienvenido a la plataforma Leonix!',
      html: `
      <div style="${emailStyles.container}">
        <div style="padding: 20px;">
          ${emailHeader}
          
          <div style="${emailStyles.card}">
            <h1 style="${emailStyles.title}">¡Tu cuenta está lista!</h1>
            <p style="${emailStyles.text}">
              Hola <strong>${userName}</strong>, tu suscripción ha sido activada correctamente. Ya puedes acceder a todas las herramientas de gestión de Leonix.
            </p>
            
            <div style="${emailStyles.credentialsBox}">
              <p style="margin: 0 0 12px 0; color: #64748B; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Credenciales de acceso</p>
              <p style="margin: 8px 0; font-size: 16px; color: #1E293B;"><strong>Usuario:</strong> ${userName}</p>
              <p style="margin: 8px 0; font-size: 16px; color: #1E293B;"><strong>Contraseña:</strong> ${tempPassword}</p>
            </div>
            
            <p style="font-size: 14px; color: ${colors.warning}; font-weight: 600; text-align: center; margin-bottom: 24px;">
              ⚠️ Se te pedirá cambiar esta contraseña al ingresar por primera vez.
            </p>
            
            <div style="text-align: center;">
              <a href="https://www.leonix.net.ar/login" style="${emailStyles.button}">Acceder al Panel</a>
            </div>
          </div>
          
          <div style="${emailStyles.footer}">
            <p>© ${new Date().getFullYear()} Leonix. Gestión Inteligente de Mantenimiento.</p>
            <p>Si tienes alguna duda, responde a este correo o contacta con nuestro equipo de soporte.</p>
          </div>
        </div>
      </div>
    `,
    });

    if (error) {
      console.error('❌ Error enviando email de bienvenida:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email de bienvenida enviado:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error enviando email de bienvenida:', error);
    return { success: false, error: error.message };
  }
}
