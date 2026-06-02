import { Link } from 'react-router-dom'
import SectionTitle from '../components/shared/SectionTitle'

type LegalSection = {
  body?: string[]
  bullets?: string[]
  title?: string
}

type LegalDocument = {
  eyebrow: string
  title: string
  updatedAt: string
  version: string
  intro: string[]
  sections: LegalSection[]
}

const contactEmail = 'contacto@ondamultimedia.com'

const privacyDocument: LegalDocument = {
  eyebrow: 'Legal',
  title: 'Política de Privacidad de ONDA Multimedia',
  version: '1.0',
  updatedAt: '31/05/2026',
  intro: [
    'En ONDA Multimedia respetamos la privacidad de las personas que visitan nuestro sitio web, se registran en nuestras actividades, generan entradas digitales, asisten a nuestros eventos, nos contactan o forman parte de nuestra comunidad cultural.',
    'Esta Política de Privacidad explica qué datos personales podemos recopilar, para qué los usamos, cómo los protegemos, con quién podríamos compartirlos y qué derechos tienen las personas titulares de esos datos.',
    'ONDA Multimedia es actualmente una marca/proyecto en proceso de formalización. Hasta que cuente con personalidad jurídica y RUT propio, el responsable del tratamiento de datos será Yessie Alexandra Neira Cortés, persona natural que administra la operación del proyecto.',
  ],
  sections: [
    {
      title: 'Datos personales que podemos recopilar',
      body: [
        'ONDA Multimedia podrá recopilar y tratar datos personales necesarios para gestionar sus actividades, servicios, eventos, invitaciones y comunicaciones.',
      ],
      bullets: [
        'Nombre y apellido.',
        'Correo electrónico.',
        'Número de teléfono.',
        'Ciudad, comuna o ubicación general.',
        'Datos asociados a invitaciones, entradas, códigos QR o registros de eventos.',
        'Estado de asistencia, validación de entrada o uso de invitación.',
        'Fecha y hora de registro, generación de entrada o validación de acceso.',
        'Mensajes enviados a través de formularios, correo electrónico, WhatsApp, Instagram u otros canales de contacto.',
        'Datos de redes sociales, como nombre de usuario de Instagram u otras plataformas, cuando hayan sido entregados directamente por la persona, provengan de una interacción previa con ONDA Multimedia, se encuentren asociados a una comunicación mantenida con nosotros o sean necesarios para gestionar invitaciones, contacto profesional, comunidad cultural o actividades vinculadas a ONDA.',
        'Información técnica básica asociada al uso del sitio, como dirección IP, navegador, dispositivo, fecha, hora o registros de actividad necesarios para seguridad, funcionamiento o trazabilidad.',
      ],
    },
    {
      title: 'Finalidades del tratamiento',
      bullets: [
        'Gestionar invitaciones, registros y accesos a eventos.',
        'Generar, administrar, descargar y validar entradas digitales o códigos QR.',
        'Confirmar identidad, asistencia o autorización de acceso a una actividad.',
        'Prevenir duplicidad, falsificación, uso indebido o fraude en entradas e invitaciones.',
        'Administrar listas de asistentes, invitados, colaboradores, artistas, productores, prensa, proveedores o personas vinculadas a actividades de ONDA Multimedia.',
        'Contactar a personas inscritas o invitadas para entregar información relacionada con un evento, cambio de horario, ubicación, acceso, instrucciones o comunicaciones operativas.',
        'Responder solicitudes enviadas mediante formularios, correo, WhatsApp, Instagram u otros canales.',
        'Coordinar servicios de producción de eventos, producción audiovisual, producción musical, marketing digital, representación de artistas, fotografía, audio, iluminación u otros servicios ofrecidos por ONDA Multimedia.',
        'Mantener una base de contactos y comunidad cultural asociada a actividades, eventos, lanzamientos, convocatorias, colaboraciones y experiencias desarrolladas por ONDA Multimedia.',
        'Enviar invitaciones, novedades, beneficios, actividades culturales, lanzamientos o comunicaciones de la Comunidad ONDA, cuando la persona haya aceptado recibir este tipo de comunicaciones o exista una relación previa que lo permita.',
        'Mejorar la gestión interna, la experiencia del sitio web, la organización de eventos y la comunicación con asistentes.',
        'Elaborar estadísticas internas de asistencia, participación, alcance de eventos y gestión cultural, idealmente de forma agregada o anonimizada.',
        'Cumplir obligaciones legales, contractuales, administrativas, contables, de seguridad o de defensa de derechos.',
      ],
    },
    {
      title: 'Consentimiento y aceptación',
      body: [
        'Cuando una persona genera una entrada digital, completa un formulario, confirma una invitación o utiliza un link único de acceso, declara haber leído y aceptado esta Política de Privacidad y los Términos y Condiciones de ONDA Multimedia.',
        'La generación de una entrada digital mediante el sitio web requiere la aceptación previa de esta Política de Privacidad y de los Términos y Condiciones.',
        'La aceptación para recibir invitaciones, novedades o comunicaciones de la Comunidad ONDA será solicitada de forma separada cuando corresponda. La persona podrá no aceptar esas comunicaciones y aun así generar su entrada, siempre que acepte las condiciones necesarias para gestionar el acceso al evento.',
      ],
    },
    {
      title: 'Base legal del tratamiento',
      bullets: [
        'El consentimiento entregado por la persona titular de los datos.',
        'La necesidad de gestionar una invitación, entrada, registro, solicitud, cotización, comunicación o servicio requerido por la persona.',
        'El cumplimiento de obligaciones legales, contractuales, administrativas o de seguridad.',
        'El interés legítimo de ONDA Multimedia en administrar sus eventos, servicios, comunicaciones, comunidad cultural, seguridad, prevención de usos indebidos y operación digital, siempre respetando los derechos de las personas titulares.',
      ],
    },
    {
      title: 'Datos ingresados por el asistente y datos gestionados internamente',
      body: [
        'En algunos casos, ONDA Multimedia podrá precargar información básica de un asistente o invitado para gestionar una invitación o generar un link único de entrada.',
        'La persona invitada podrá completar o confirmar los datos requeridos para generar su entrada digital. Algunos datos, como redes sociales asociadas a una interacción previa, contacto profesional, historial de invitación o clasificación interna de gestión, podrán ser administrados internamente por ONDA Multimedia y no necesariamente aparecerán como campos editables en el formulario público.',
        'Estos datos internos serán utilizados únicamente para finalidades relacionadas con la gestión de eventos, comunidad cultural, contacto profesional, comunicación, administración de invitaciones o servicios de ONDA Multimedia.',
      ],
    },
    {
      title: 'Comunidad ONDA',
      body: [
        'ONDA Multimedia podrá mantener una comunidad de asistentes, artistas, productores, colaboradores, público cultural, aliados y personas interesadas en actividades vinculadas a la música, la cultura, la producción de eventos y la industria creativa.',
        `Cuando una persona acepte formar parte de la Comunidad ONDA, sus datos de contacto podrán ser utilizados para enviar invitaciones, novedades, lanzamientos, beneficios, convocatorias, actividades culturales, eventos, colaboraciones o comunicaciones relacionadas con ONDA Multimedia. La persona podrá solicitar en cualquier momento dejar de recibir estas comunicaciones o pedir la eliminación de sus datos de contacto escribiendo a ${contactEmail}.`,
      ],
    },
    {
      title: 'Conservación de datos',
      body: [
        'ONDA Multimedia conservará los datos personales durante el tiempo necesario para cumplir las finalidades informadas en esta Política.',
        'Los datos asociados a entradas, invitaciones, validación de acceso, listas de asistentes y gestión operativa de eventos podrán conservarse mientras sean necesarios para administrar la actividad, mantener respaldos internos, prevenir usos indebidos, analizar asistencia, resolver incidencias, cumplir obligaciones legales o contractuales, y proteger los derechos de ONDA Multimedia, asistentes, colaboradores o terceros.',
        'Cuando los datos ya no sean necesarios para las finalidades indicadas, ONDA Multimedia podrá eliminarlos, anonimizarlos o conservarlos únicamente de forma estadística o agregada.',
      ],
    },
    {
      title: 'Seguridad de la información',
      body: [
        'ONDA Multimedia adoptará medidas razonables para proteger los datos personales contra pérdida, acceso no autorizado, alteración, uso indebido, divulgación o destrucción.',
      ],
      bullets: [
        'Uso de plataformas tecnológicas con autenticación.',
        'Control y restricción de accesos internos.',
        'Gestión de permisos por roles.',
        'Uso de bases de datos, hosting y servicios tecnológicos seguros.',
        'Revisión de formularios, accesos y registros.',
        'Eliminación, anonimización o depuración de datos que ya no sean necesarios.',
        'Registro de fechas de aceptación de políticas, generación de entradas y validación de accesos.',
      ],
    },
    {
      title: 'Comunicación de datos a terceros',
      body: ['ONDA Multimedia no vende datos personales. Podremos compartir datos personales únicamente cuando sea necesario para cumplir las finalidades descritas en esta Política.'],
      bullets: [
        'Proveedores tecnológicos.',
        'Servicios de hosting, base de datos, almacenamiento o correo electrónico.',
        'Plataformas de formularios, mensajería, análisis o gestión digital.',
        'Equipos internos, colaboradores o prestadores de servicios autorizados.',
        'Proveedores vinculados a la producción, seguridad, acreditación o gestión de eventos, cuando sea estrictamente necesario.',
        'Autoridades públicas, tribunales u organismos competentes, cuando exista obligación legal.',
      ],
    },
    {
      title: 'Transferencias internacionales',
      body: [
        'Algunos servicios tecnológicos utilizados por ONDA Multimedia podrían almacenar o procesar información fuera de Chile. En esos casos, ONDA Multimedia procurará trabajar con proveedores que ofrezcan estándares adecuados de seguridad, confidencialidad y protección de datos.',
      ],
    },
    {
      title: 'Derechos de las personas titulares',
      body: [`Las personas titulares de datos personales pueden solicitar acceso, rectificación, eliminación, oposición, revocación del consentimiento o suspensión de comunicaciones no deseadas escribiendo a ${contactEmail}. La solicitud debe indicar nombre completo, medio de contacto y una descripción clara de lo solicitado.`],
    },
    {
      title: 'Comunicaciones comerciales y culturales',
      body: [
        `ONDA Multimedia podrá enviar comunicaciones relacionadas con eventos, invitaciones, servicios solicitados, registros activos, entradas generadas o información relevante para la persona usuaria. Las comunicaciones promocionales, novedades, actividades culturales, invitaciones futuras o campañas de Comunidad ONDA podrán enviarse cuando exista aceptación de la persona, una relación previa que lo permita o una base legítima para dicha comunicación. La persona podrá solicitar dejar de recibir estas comunicaciones escribiendo a ${contactEmail}.`,
      ],
    },
    {
      title: 'Uso de cookies y tecnologías similares',
      body: [
        'El sitio web de ONDA Multimedia puede utilizar cookies o tecnologías similares para mejorar la navegación, recordar preferencias, analizar el uso del sitio, medir campañas digitales o mejorar la experiencia de usuario. La persona usuaria puede configurar su navegador para rechazar o eliminar cookies.',
      ],
    },
    {
      title: 'Datos de menores de edad',
      body: [
        'Los servicios, formularios y eventos de ONDA Multimedia están dirigidos principalmente a personas mayores de edad. No recopilamos intencionalmente datos personales de menores de edad sin autorización de su madre, padre, tutor o representante legal.',
      ],
    },
    {
      title: 'Fotografías, videos y registro audiovisual en eventos',
      body: [
        'ONDA Multimedia puede realizar registros fotográficos o audiovisuales en eventos, actividades, lanzamientos, grabaciones o producciones propias o de terceros. Cuando corresponda, se informará a los asistentes que la actividad puede ser registrada con fines de difusión, archivo, redes sociales, portafolio, prensa, comunicación institucional o promoción de actividades de ONDA Multimedia.',
      ],
    },
    {
      title: 'Cambios en esta Política',
      body: [
        'ONDA Multimedia podrá actualizar esta Política de Privacidad para reflejar cambios legales, técnicos, operativos o comerciales. La versión vigente estará disponible en el sitio web.',
      ],
    },
    {
      title: 'Contacto',
      body: [`ONDA Multimedia. Correo: ${contactEmail}. Ubicación: Freirina, Región de Atacama, Chile.`],
    },
  ],
}

const termsDocument: LegalDocument = {
  eyebrow: 'Legal',
  title: 'Términos y Condiciones de Uso de ONDA Multimedia',
  version: '1.0',
  updatedAt: '31/05/2026',
  intro: [
    'Bienvenido/a al sitio web de ONDA Multimedia. Al acceder, navegar, completar formularios, generar entradas digitales, confirmar invitaciones, registrarte en eventos o utilizar nuestros servicios digitales, aceptas estos Términos y Condiciones.',
    'Si no estás de acuerdo con estos términos, te recomendamos no utilizar el sitio ni enviar información mediante sus formularios o links de invitación.',
    `Este sitio web pertenece a ONDA Multimedia, marca/proyecto actualmente en proceso de formalización. Mientras no exista una persona jurídica constituida, la administración y responsabilidad operativa recaerá en Yessie Alexandra Neira Cortés. Correo de contacto: ${contactEmail}.`,
  ],
  sections: [
    {
      title: 'Uso del sitio web',
      body: ['La persona usuaria se compromete a utilizar el sitio web de forma lícita, respetuosa y conforme a estos Términos y Condiciones.'],
      bullets: [
        'No usar el sitio para fines fraudulentos, ilegales o no autorizados.',
        'No intentar acceder a áreas privadas, bases de datos, servidores, cuentas o sistemas sin autorización.',
        'No interferir con el funcionamiento normal del sitio.',
        'No enviar información falsa, ofensiva, maliciosa o que vulnere derechos de terceros.',
        'No usar formularios, links de invitación o sistemas de registro para suplantar identidad.',
        'No copiar, modificar, distribuir o explotar contenido del sitio sin autorización.',
        'No manipular, duplicar, vender o transferir entradas, invitaciones o códigos QR sin autorización de ONDA Multimedia.',
      ],
    },
    {
      title: 'Información disponible en el sitio',
      body: [
        'El contenido publicado en el sitio web tiene fines informativos, comerciales, artísticos, culturales y promocionales. ONDA Multimedia procura mantener la información actualizada, pero no garantiza que todo el contenido esté libre de errores, omisiones o desactualizaciones.',
      ],
    },
    {
      title: 'Servicios ofrecidos',
      bullets: [
        'Producción de eventos.',
        'Producción audiovisual.',
        'Producción musical.',
        'Representación, acompañamiento y management de artistas.',
        'Marketing digital.',
        'Campañas publicitarias.',
        'Fotografía.',
        'Audio e iluminación.',
        'Producción multimedia.',
        'Gestión de marca.',
        'Desarrollo de proyectos culturales, artísticos o creativos.',
      ],
    },
    {
      title: 'Cotizaciones, reservas y pagos',
      body: [
        'Las cotizaciones entregadas por ONDA Multimedia tendrán la vigencia indicada en cada propuesta. Las reservas de fechas, servicios, equipos, artistas, espacios o producción solo quedarán confirmadas cuando exista aceptación expresa por parte de ONDA Multimedia y, si corresponde, pago de reserva, abono o firma de contrato.',
      ],
    },
    {
      title: 'Eventos, entradas, invitaciones y códigos QR',
      bullets: [
        'La entrada, invitación o QR puede ser personal, único e intransferible, salvo que ONDA Multimedia indique expresamente lo contrario.',
        'Un código QR podrá ser válido solo una vez.',
        'ONDA Multimedia podrá verificar identidad, estado de invitación, validez del registro, consentimiento legal o autorización de acceso.',
        'La falsificación, duplicación, venta no autorizada, transferencia no autorizada o uso indebido de entradas, links de invitación o códigos QR podrá implicar la anulación del acceso.',
        'ONDA Multimedia podrá rechazar o cancelar una entrada si detecta información falsa, uso fraudulento, duplicidad, suplantación o incumplimiento de estos términos.',
        'ONDA Multimedia se reserva el derecho de admisión cuando exista incumplimiento de normas del evento, riesgos de seguridad, suplantación, comportamiento violento, daño a terceros o uso fraudulento del sistema.',
      ],
    },
    {
      title: 'Generación de entrada mediante link único',
      body: [
        'ONDA Multimedia podrá enviar a determinadas personas un link único de invitación para generar una entrada digital. La persona que recibe el link deberá completar o confirmar los datos solicitados, aceptar la Política de Privacidad y estos Términos y Condiciones, y luego generar su entrada digital.',
        'La generación de la entrada implica que la persona declara que la información entregada es verdadera, actualizada y corresponde a su identidad o a la persona autorizada para asistir. El link único es personal y no debe ser compartido con terceros, salvo autorización expresa de ONDA Multimedia.',
      ],
    },
    {
      title: 'Descarga y uso de entrada digital',
      body: [
        'Una vez generada la entrada, la persona podrá descargarla, guardarla en su dispositivo o recibirla por los medios que ONDA Multimedia tenga disponibles. La persona asistente es responsable de presentar su entrada digital o código QR al momento del acceso, si el evento lo requiere.',
      ],
    },
    {
      title: 'Comunidad ONDA y comunicaciones',
      body: [
        `La aceptación para recibir invitaciones, novedades o comunicaciones de Comunidad ONDA será opcional y separada de la aceptación necesaria para generar una entrada o utilizar el sitio. La persona podrá solicitar dejar de recibir estas comunicaciones escribiendo a ${contactEmail}.`,
      ],
    },
    {
      title: 'Registro audiovisual en eventos',
      body: [
        'Al asistir a eventos, activaciones, grabaciones o actividades organizadas o gestionadas por ONDA Multimedia, la persona asistente entiende que podrían realizarse registros fotográficos o audiovisuales del ambiente general con fines de difusión, archivo, redes sociales, portafolio, prensa, comunicación institucional o promoción.',
      ],
    },
    {
      title: 'Propiedad intelectual',
      body: [
        'Todos los contenidos del sitio, incluyendo textos, diseños, logotipos, gráficos, fotografías, videos, piezas audiovisuales, marcas, nombres comerciales, ilustraciones, música, animaciones, interfaces y elementos visuales, son propiedad de ONDA Multimedia o de sus respectivos titulares. No se permite copiar, reproducir, distribuir, modificar, vender, explotar o utilizar estos contenidos sin autorización previa y por escrito.',
      ],
    },
    {
      title: 'Contenido de artistas, clientes o terceros',
      body: [
        'El sitio puede mostrar contenido relacionado con artistas, clientes, proyectos, eventos, marcas, aliados o colaboradores. Dicho contenido se publica con fines informativos, promocionales o de portafolio. Los derechos sobre obras, marcas, imágenes, interpretaciones, música, fotografías, videos o materiales de terceros pertenecen a sus respectivos titulares.',
      ],
    },
    {
      title: 'Enlaces a terceros',
      body: [
        'El sitio puede incluir enlaces a plataformas externas como WhatsApp, Instagram, YouTube, Spotify, TikTok, Google, Meta u otros servicios. ONDA Multimedia no controla ni se hace responsable por el contenido, políticas, disponibilidad, seguridad o prácticas de privacidad de sitios o plataformas externas.',
      ],
    },
    {
      title: 'Protección de datos personales',
      body: [
        'El tratamiento de datos personales realizado por ONDA Multimedia se regula en nuestra Política de Privacidad. Al completar formularios, generar entradas digitales, registrarte en eventos o utilizar links de invitación, declaras haber leído y aceptado la Política de Privacidad correspondiente.',
      ],
    },
    {
      title: 'Responsabilidad del usuario',
      body: [
        'La persona usuaria es responsable de entregar información verdadera, actualizada y completa cuando utilice formularios, sistemas de registro, solicitudes de contacto, links de invitación o inscripción a eventos.',
      ],
    },
    {
      title: 'Disponibilidad del sitio',
      body: [
        'ONDA Multimedia procurará mantener el sitio web disponible y funcionando correctamente, pero no garantiza disponibilidad continua, ininterrumpida o libre de errores. El sitio podría suspenderse temporalmente por mantenimiento, actualizaciones, fallas técnicas, problemas de proveedores, causas de fuerza mayor o circunstancias fuera del control de ONDA Multimedia.',
      ],
    },
    {
      title: 'Limitación de responsabilidad',
      body: [
        'ONDA Multimedia no será responsable por daños derivados del mal uso del sitio, fallas de conexión, interrupciones técnicas, virus, accesos no autorizados, errores de terceros, plataformas externas, información falsa entregada por usuarios, uso indebido de entradas, pérdida de códigos QR o imposibilidad técnica de acceso causada por factores externos.',
      ],
    },
    {
      title: 'Modificaciones',
      body: [
        'ONDA Multimedia podrá modificar estos Términos y Condiciones cuando sea necesario por razones legales, técnicas, comerciales u operativas. La versión vigente estará disponible en el sitio web.',
      ],
    },
    {
      title: 'Legislación aplicable y jurisdicción',
      body: [
        'Estos Términos y Condiciones se rigen por las leyes de la República de Chile. Cualquier controversia relacionada con el uso del sitio, servicios digitales, entradas, invitaciones o estos términos será sometida a los tribunales competentes de Chile.',
      ],
    },
    {
      title: 'Contacto',
      body: [`ONDA Multimedia. Correo: ${contactEmail}. Ubicación: Freirina, Región de Atacama, Chile.`],
    },
  ],
}

function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <section className="dark bg-onda-night py-16 pb-28 text-onda-soft">
      <div className="onda-container">
        <SectionTitle eyebrow={document.eyebrow} title={document.title} subtitle={`Versión ${document.version} · Última actualización: ${document.updatedAt}`} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <aside className="glass-panel rounded-lg bg-onda-black/70 p-5">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-onda-lavender">
              ONDA Multimedia
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-onda-muted">
              <a href={`mailto:${contactEmail}`} className="transition hover:text-onda-lavender">
                {contactEmail}
              </a>
              <a href="https://ondamultimedia.com/" target="_blank" rel="noreferrer" className="transition hover:text-onda-lavender">
                ondamultimedia.com
              </a>
              <Link to="/terminos-y-condiciones" className="transition hover:text-onda-lavender">
                Términos y Condiciones
              </Link>
              <Link to="/politicas-de-privacidad" className="transition hover:text-onda-lavender">
                Política de Privacidad
              </Link>
            </div>
          </aside>

          <article className="glass-panel rounded-lg bg-onda-black/70 p-5 sm:p-7">
            <div className="grid gap-4 text-sm leading-7 text-onda-muted sm:text-base">
              {document.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 grid gap-7">
              {document.sections.map((section, index) => (
                <section key={`${section.title}-${index}`} className="border-t border-onda-purple/16 pt-6">
                  {section.title ? (
                    <h2 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-white">
                      {index + 1}. {section.title}
                    </h2>
                  ) : null}
                  {section.body?.length ? (
                    <div className="mt-4 grid gap-4 text-sm leading-7 text-onda-muted sm:text-base">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                  {section.bullets?.length ? (
                    <ul className="mt-4 grid gap-3 text-sm leading-7 text-onda-muted sm:text-base">
                      {section.bullets.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-onda-lavender" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export function PrivacyPolicy() {
  return <LegalDocumentPage document={privacyDocument} />
}

export function TermsConditions() {
  return <LegalDocumentPage document={termsDocument} />
}
