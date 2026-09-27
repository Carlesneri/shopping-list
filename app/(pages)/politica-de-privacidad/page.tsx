import type { Metadata } from "next"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo trata COMPALE tus datos: qué guardamos, con qué proveedores trabajamos y qué derechos tienes sobre tu información.",
  alternates: { canonical: "/politica-de-privacidad" },
  openGraph: {
    title: "Política de privacidad — COMPALE",
    description:
      "Cómo trata COMPALE tus datos: qué guardamos, con qué proveedores trabajamos y qué derechos tienes.",
    url: "/politica-de-privacidad",
  },
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <div className="flex flex-col gap-3 text-text/70 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="px-4 py-8 max-w-lg mx-auto w-full text-start">
      <div className="flex items-center gap-2 mb-6 text-text/70">
        <IconArrowLeft size={18} />
        <Link
          href="/"
          className="font-medium underline underline-offset-4 hover:text-text"
        >
          Ir al inicio
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Política de privacidad</h1>
      <p className="text-text/60 text-sm">
        Última actualización: 27 de septiembre de 2026
      </p>

      <p className="mt-6 text-text/70 leading-relaxed">
        En COMPALE creamos herramientas para compartir listas, notas y tu propia
        biblioteca multimedia. Esta política explica, en lenguaje claro, qué
        datos tratamos, por qué lo hacemos y qué puedes hacer al respecto.
      </p>

      <Section title="1. Responsable del tratamiento">
        <p>
          COMPALE es un proyecto independiente. Puedes contactarnos para
          cualquier cuestión sobre privacidad en el correo de contacto que
          aparece al final de esta página.
        </p>
      </Section>

      <Section title="2. Qué datos tratamos">
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <strong className="text-text">Datos de tu cuenta:</strong> al
            iniciar sesión con Google recibimos tu nombre, tu correo electrónico
            y tu foto de perfil. No recibimos tu contraseña de Google.
          </li>
          <li>
            <strong className="text-text">Contenido que creas:</strong> las
            listas y productos, las notas y los accesos directos que guardas en
            la app, junto con los correos de las personas que invitas a
            colaborar.
          </li>
          <li>
            <strong className="text-text">
              Configuración de almacenamiento:
            </strong>{" "}
            si conectas tu propia nube, guardamos las credenciales que
            introduces (Cloudflare R2) o el token de acceso (Google Drive)
            necesarios para listar y reproducir tus archivos.
          </li>
          <li>
            <strong className="text-text">Datos de uso:</strong> métricas
            anónimas de visita (páginas vistas, país, dispositivo) para saber
            cómo se usa la app.
          </li>
        </ul>
      </Section>

      <Section title="3. Para qué los usamos">
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>Crear tu cuenta y mantener la sesión abierta.</li>
          <li>
            Prestar el servicio: sincronizar tus listas y notas en tiempo real
            con las personas que tú mismo invitas.
          </li>
          <li>
            Acceder a tu almacenamiento (R2 o Drive) únicamente para listar,
            subir y reproducir los archivos que pides.
          </li>
          <li>Mejorar la app gracias a estadísticas de uso agregadas.</li>
        </ul>
        <p>
          No vendemos tus datos, no los usamos para publicidad y no los cedemos
          a terceros con fines propios.
        </p>
      </Section>

      <Section title="4. Tus archivos multimedia">
        <p>
          COMPALE no almacena tus vídeos, fotos ni música. Cuando conectas un
          storage, los archivos se leen y se escriben directamente entre tu
          navegador y tu nube:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <strong className="text-text">Cloudflare R2:</strong> tus claves se
            guardan cifradas en nuestra base de datos y solo se usan en el
            servidor para generar URLs firmadas de tu propio bucket.
          </li>
          <li>
            <strong className="text-text">Google Drive:</strong> solicitamos un
            permiso de acceso a tu Drive que se guarda también cifrado. Lo
            usamos solo para gestionar los archivos que ves en la app, y puedes
            revocarlo en cualquier momento desde la{" "}
            <a
              className="underline underline-offset-2 hover:text-text"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              página de permisos de tu cuenta de Google
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="5. Proveedores con los que trabajamos">
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <strong className="text-text">Google (Firebase):</strong>{" "}
            autenticación y base de datos donde se guardan tus listas, notas y
            configuraciones.
          </li>
          <li>
            <strong className="text-text">Google (OAuth y Drive):</strong>{" "}
            inicio de sesión y acceso a tu Drive, si lo conectas.
          </li>
          <li>
            <strong className="text-text">Cloudflare:</strong> solo tus propios
            buckets de R2, con tus credenciales.
          </li>
          <li>
            <strong className="text-text">Ahrefs Analytics:</strong> analítica
            web sin cookies que no identifica a personas.
          </li>
        </ul>
      </Section>

      <Section title="6. Cookies y almacenamiento local">
        <p>
          Usamos únicamente lo imprescindible: una cookie de sesión para
          mantenerte identificado y el almacenamiento local de tu navegador para
          recordar detalles como la posición de reproducción de un vídeo. No
          usamos cookies publicitarias ni de rastreo.
        </p>
      </Section>

      <Section title="7. Cuánto tiempo conservamos los datos">
        <p>
          Tu contenido se conserva mientras exista en la app: si eliminas una
          lista, una nota o un storage, se borra de forma permanente.
        </p>
      </Section>

      <Section title="8. Seguridad">
        <p>
          Todo el tráfico viaja por HTTPS y las credenciales de tus storages se
          guardan cifradas con claves que no salen del servidor. El acceso a los
          documentos está restringido a las personas que cada propietario
          invita.
        </p>
      </Section>

      <Section title="9. Tus derechos">
        <p>
          Si estás en el Espacio Económico Europeo, tienes derecho a acceder,
          rectificar, eliminar, limitar o portar tus datos, así como a retirar
          tu consentimiento y a presentar una reclamación ante la autoridad de
          control de tu país. Para ejercerlos, escríbenos al correo de contacto.
        </p>
      </Section>

      <Section title="10. Menores">
        <p>
          COMPALE no está dirigida a menores de 14 años y no tratamos sus datos
          de forma deliberada. Si crees que un menor ha creado una cuenta,
          contáctanos para eliminarla.
        </p>
      </Section>

      <Section title="11. Cambios en esta política">
        <p>
          Si cambiamos algo importante, lo avisaremos en la app antes de que
          entre en vigor. La fecha de la última actualización siempre aparece al
          principio de esta página.
        </p>
      </Section>

      <Section title="12. Contacto">
        <p>
          Dudas, solicitudes o ejercicios de derechos:{" "}
          <a
            className="underline underline-offset-2 hover:text-text"
            href="mailto:compaleapp@gmail.com"
          >
            compaleapp@gmail.com
          </a>
          .
        </p>
      </Section>
    </div>
  )
}
