# Auditoría de la web desplegada

Revisión del 3 de noviembre de 2026 sobre la web ya desplegada. Recoge el **antes/después** acordado antes de enseñar la v1. Las decisiones están cerradas e **implementadas en las llescas 7–20** (nov 2026).

El producto vigente está en el [PRD](./prd.md), el [TRD](./trd.md) y [app-flow](./app-flow.md). Este archivo no sustituye a esos documentos; conserva el registro de la auditoría. El registro del grilling original no se toca.

Corte en llescas y orden de ejecución: [hoja de ruta](./hoja-de-ruta.md#auditoria-web) (bloque cerrado). Una sección de este archivo era una llesca, no un único PR.

## Segundo box

Hoy hay una empresa y una sede. No existe el box como dato: horario, plantilla, clases, socios, tarifas, biblioteca y equipo son únicos.

Sigue habiendo una empresa. Un box es una sede de esa empresa. Puede haber más de dos.

### Qué sigue siendo único

Tarifas, biblioteca, tipos de clase y equipo. Un tipo sirve en cualquier box. Un entrenamiento de la biblioteca se asigna a una clase del box que sea, si el tipo coincide. Un coach del equipo puede dar clase en cualquier box.

El cupo del socio es de la empresa. Reservar en otro box gasta el mismo cupo de dirigidas, de opens o de bono. Una persona no puede tener dos reservas a la misma hora, aunque sean boxes distintos: sigue valiendo la regla de no solaparse.

### Qué es de cada box

El horario de apertura, los cierres y las pausas por fecha, la plantilla semanal y las clases. El horario de un box puede ser distinto del otro. La plantilla también. Una clase tiene que caer dentro del horario de su propio box.

Al guardar el horario se comprueban solo la plantilla y las clases futuras de ese box. Otro box no entra en esa comprobación. La grilla que se está viendo usa el eje de apertura de ese box.

Dentro de un box, Dirigidas y Open pueden coincidir en hora, y dos clases de la misma grilla no. Entre boxes sí pueden coincidir en hora.

### Cómo se elige el box

Arriba, el box. Debajo, Dirigidas | Open en las pantallas que ya tienen grilla. Se ve una sola grilla, la del box elegido, del mismo tamaño que ahora.

Ese par va en Semana, Plantilla y el calendario del socio. En Horario va solo el selector de box, porque no hay grilla. En Hoy va el selector de box y, debajo, Dirigidas y Open de ese box se siguen viendo como ahora: las dos en pantalla ancha y una en pantalla estrecha.

El box elegido viaja en la dirección de la página, igual que hoy viaja Dirigidas u Open. Abrir Semana, Plantilla, Hoy u Horario sin box muestra el primero. El calendario del socio sin box abre su box de preferencia.

Excepciones no filtra: lista las de todos los boxes y la card dice cuál es. Añadir una clase extra pide el box. El detalle de una clase, de staff o de socio, dice el box junto a la hora. Mis reservas y el historial también lo dicen, y no se esconden al cambiar la preferencia.

Añadir y renombrar un box se hace en Horario, y solo el admin. En las demás pantallas el selector cambia de box y no administra. El coach usa el selector donde ya entra hoy. Dos boxes no pueden llamarse igual.

### Boxes nuevos y los que ya existen

Lo que hay hoy pasa a ser el primer box. Su nombre inicial es Box 1 y conserva el horario actual. Sus clases siguen siendo suyas. Sus socios quedan con ese box de pago y esa preferencia.

El admin puede añadir otro con un nombre. Nace con la plantilla vacía y abierto de 07:00 a 21:00 los siete días. Entra en el selector. El horario se cambia después en Horario. En esta v1 un box no se borra.

### El socio tiene dos boxes

El de pago y el de preferencia. Nacen los dos con el box elegido en el alta. El alta lo trae en el primer box y el staff puede cambiarlo antes de guardar.

El de pago lo ve y lo cambia el staff, en el alta y en la ficha, si el socio pasa a pagar en otro sitio. No cancela reservas ni reescribe pagos ya hechos. La tabla de Socios muestra ese box. Encima de la tabla se lee cuántos socios activos pagan en cada uno. La tabla no se filtra. Impagos abre con todos y se puede dejar en un solo box de pago.

El de preferencia lo cambia el socio. El calendario abre en ese box. Elegir otro box en su selector lo guarda y será el de la próxima entrada. Cambiar Dirigidas u Open no lo guarda. Sigue viendo y reservando en los demás boxes. El staff no edita la preferencia.

## Campo vacío

En Equipo, teléfono y correo vacíos dicen «Sin indicar». En Socios, en fichas y en la cuenta del socio, el vacío es «—».

El vacío pasa a ser «—» en Equipo, Socios, fichas, Mi perfil del staff y la cuenta del socio.

## Migas

No hay migas. El menú ya marca la sección. La miga sale solo en el panel staff, en el hueco que el encabezado ya tiene encima del título, y solo cuando la pantalla cuelga de otra:

- Socios / nombre, Socios / Nuevo socio, Socios / nombre / Pagos
- Equipo / nombre, Equipo / Nueva cuenta
- Biblioteca / nombre, Biblioteca / Nuevo entrenamiento, Biblioteca / nombre / Editar
- Detalle de una clase: Hoy, Semana o Excepciones, según desde dónde se abrió, y luego el nombre de la clase

La sección es un enlace. La página actual no. Hoy, Semana, Plantilla, Horario, los listados y la app del socio no llevan miga. La miga no repite el box: el box se lee en el selector o en el detalle de la clase.

## Avisos de los campos

Varios campos usan el aviso nativo del navegador. En el alta de un entrenamiento, «Completa este campo» aparece suelto en la esquina superior izquierda. Es el mismo fallo de las dos capturas: el globo del navegador y el contenido que queda debajo de Guardar.

Fecha, hora, números e imagen ya avisan debajo del campo. Ese aviso se usa en los formularios del panel y en el acceso. Un campo incompleto o inválido lo muestra bajo el control. El globo del navegador no se abre. El toast queda para el fallo del servidor.

En el entrenamiento, el nombre vacío no es un error. Tipo, fase e indicaciones sí avisan bajo su campo. Un nombre repetido avisa bajo el nombre.

## Equipo

En la tabla, el nombre queda un poco alto respecto al avatar. Socios centra el avatar con el nombre.

El nombre de Equipo se alinea con el avatar igual que en Socios.

## Socios

La columna Tarifa no dice el nombre de la tarifa. Si es un plan, muestra «Cupo semanal» o «Cupo mensual». Si además hay saldo de bono, añade «12 bono». El bono no tiene nombre propio: es un saldo.

La columna conserva su ancho. Dentro de la celda:

- el nombre de la tarifa activa, truncado, con el nombre completo al posar el puntero;
- si esa tarifa es un plan y además hay saldo de bono, una segunda línea «Bono · 12».

Si la tarifa activa ya es un bono, la celda muestra solo su nombre. La fila no gana una columna.

## Tarifas

Dirigidas y opens son dos números obligatorios. Cero significa que ese cupo no entra. No hay ilimitado.

En una tarifa de cupo semanal o mensual, cada contador tiene la opción Ilimitadas, por separado. Con esa opción el número no se pide. Siguen siendo válidos el cero, un número, o Ilimitadas en uno de los dos o en los dos. El bono no tiene esta opción.

Quien reserva no choca con el tope de un cupo ilimitado. Siguen valiendo las plazas, el solape y el otro cupo si ese sí tiene tope. En la ficha de la tarifa y en Mi tarifa, un cupo ilimitado se lee con las usadas y la palabra Ilimitadas. Uno que es cero se sigue leyendo como cero. El ajuste manual del periodo en curso solo se ofrece en un cupo que tiene tope.

## Tipos de clase

Hoy un tipo no existe sin imagen. El bloque del calendario, de la plantilla y de Semana es esa imagen y el aforo, sin el nombre.

La imagen deja de ser obligatoria al crear y al editar.

- Con foto, el bloque sigue siendo la imagen y el aforo, sin el nombre.
- Sin foto, el bloque es una superficie neutra, sin foto de relleno, y enseña el nombre del tipo y el aforo.
- En las cards de Tipos y de Excepciones, el hueco de la foto queda en un recuadro neutro. El nombre sigue al lado, donde ya está.

## Plantilla

### Duplicar una clase

Para repetir una clase hay que rellenar el formulario desde cero.

En la clase aparece Duplicar. Abre el formulario de clase nueva, en el mismo día y el mismo box, con tipo, hora, aforo y coach ya puestos. No se guarda sola. Si se deja la misma hora, el solape de esa grilla impide guardarla. Al confirmar, entra en el borrador de ese box.

### Publicar

Cada box tiene su plantilla y su borrador. Cambiar entre Dirigidas y Open dentro del box conserva las dos grillas. Pasar a otro box deja el borrador anterior pendiente.

Aplicar plantilla publica solo el box en pantalla, Dirigidas y Open, desde el lunes siguiente. Cancelar cambio descarta solo ese box. El otro box no cambia.

### Coach en la cajita

La cajita muestra las plazas y, si hay coach, su nombre.

El nombre del coach sale de la cajita. El resto de la cajita se queda. El coach sigue en el formulario de la clase y en el detalle. Quien usa lector de pantalla sigue oyendo el coach al enfocar la cajita. Si el tipo no tiene foto, el nombre que aparece en el bloque es el del tipo, no el del coach.

## Biblioteca

### Nombre

El nombre es obligatorio y puede repetirse. El alta lo exige con el aviso del navegador y con un toast.

El nombre se puede dejar vacío. Si se guarda vacío, el nombre que queda es la fecha de ese guardado en Europe/Madrid, día, mes corto y año: `3 nov 2026`. Si ese nombre ya existe en la biblioteca, se añade ` · 2`, ` · 3`, y así. Quien quiera otro nombre lo escribe. Al editar, borrar el nombre y guardar vuelve a asignar la fecha de ese guardado.

La fecha es la de la empresa, no la de apertura de un box. Se usa una fecha y no un código `E-001` porque en el listado el nombre es lo que identifica el entrenamiento.

### No se repite

Al guardar, otro entrenamiento de la biblioteca no puede tener el mismo nombre, sin distinguir mayúsculas ni espacios de más. El aviso sale bajo el campo. Los repetidos que ya existan se quedan hasta que se editen. Al editar uno, el nombre tiene que quedar único.

### Volver a elegir cómo empezar

Al crear, si no hay fases se ofrecen «Empezar en blanco» y «Usar estructura habitual». La última fase no se puede borrar, así que no se vuelve a esa elección.

Se pueden quitar fases hasta que no quede ninguna. Vuelven los dos botones. El nombre y el tipo se conservan. Guardar sigue exigiendo al menos una fase con sus indicaciones.

### El formulario se acuerda de lo cancelado

Se rellena un entrenamiento, se pulsa Cancelar y, al crear otro, siguen los datos. Cada entrada en Nuevo entrenamiento abre el formulario vacío. Editar uno ya guardado sigue cargando ese entrenamiento.

### La barra tapa el formulario

La barra de Cancelar y Guardar se queda fija y el contenido pasa por debajo. El último campo tiene que poder subir del todo por encima de la barra.

### El aviso de la esquina

Es el aviso nativo del navegador. Queda resuelto con los avisos de campo.

## Excepciones

La card trae foto, nombre, día, hora, aforo, una fila con el coach, otra con «Dirigida» u «Open», y a la derecha las pastillas Clase extra, Modificada o Cancelada.

La card no crece. Junto al nombre se lee el estado: Extra, Modificada o Cancelada. Una cancelada conserva el anillo que ya la marca. La segunda línea lleva el box, el día, la hora, el aforo y, si hay coach, su nombre. Desaparecen la fila del coach, la línea de «Dirigida» u «Open» y las pastillas de la derecha.

## Qué cambia en el PRD y el TRD

- Una empresa, con boxes. Cada uno tiene horario, cierres, plantilla y clases. Aplicar plantilla publica solo el box en pantalla.
- El socio tiene box de pago y box de preferencia. Puede reservar en cualquiera. El cupo no se parte y no se solapa con otra reserva suya.
- El cupo de una tarifa puede ser ilimitado en dirigidas, en opens o en las dos.
- Un tipo de clase puede no tener imagen. Sin foto, el bloque muestra el nombre del tipo.
- El entrenamiento puede guardarse sin nombre escrito. El nombre guardado es único en la biblioteca. Si hacía falta, es la fecha del guardado.
- La plantilla puede abrir una clase nueva copiando otra del mismo box. La biblioteca sigue sin duplicar fichas.
