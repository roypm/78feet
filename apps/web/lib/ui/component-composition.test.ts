import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { FormActions } from "@/components/common/forms/form-actions";
import { PaymentFields } from "@/components/payments/payment-fields";
import DevCompositionPage from "@/app/dev/component-composition/page";
import { ListOptions } from "@/components/common/lists/list-options";
import { PERSON_SORTS } from "@/lib/box/list-sorting";
import { ResourceImage } from "@/components/common/media/resource-image";
import { BoxTabs } from "@/components/boxes/box-tabs";

vi.stubGlobal("React", React);

const render = (element: React.ReactElement) => {
  const router = createMemoryRouter([{ path: "*", Component: () => element }], { initialEntries: ["/staff/cobros"] });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
};

describe("composición de formularios", () => {
  it("bloquea cancelar y enviar durante una petición", () => {
    const html = render(
      createElement(FormActions, {
        pending: true,
        onCancel: vi.fn(),
        submitLabel: "Guardar",
        pendingLabel: "Guardando…",
      }),
    );
    expect(html.match(/ disabled=""/g)).toHaveLength(2);
    expect(html).toContain('aria-busy="true"');
  });

  it("conserva el formulario sin cancelación y el bloqueo previo al envío", () => {
    const html = render(
      createElement(FormActions, {
        pending: false,
        submitLabel: "Guardar",
        submitDisabled: true,
      }),
    );
    expect(html).not.toContain("Cancelar");
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
  });

  it("mantiene el importe cero y el método al corregir un pago", () => {
    const html = render(
      createElement(
        "form",
        null,
        createElement(PaymentFields, {
          disabled: false,
          amountCents: 0,
          method: "bizum",
        }),
      ),
    );
    expect(html).toContain('name="amountEuros"');
    expect(html).toContain('value="0.00"');
    expect(html).toContain('name="method"');
    expect(html).toContain('value="bizum"');
  });
});

describe("selector de sede", () => {
  const boxes = Array.from({ length: 4 }, (_, index) => ({
    id: String(index),
    slug: `box-${index + 1}`,
    name: `Box ${index + 1}`,
  }));
  const hrefFor = (id: string) => `/staff/cobros?box=${id}`;

  it("oculta una sede única y una lista vacía", () => {
    expect(render(createElement(BoxTabs, { boxes: [], hrefFor }))).toBe("");
    expect(render(createElement(BoxTabs, { boxes: boxes.slice(0, 1), hrefFor }))).toBe("");
  });

  it("cuenta sedes reales al añadir Todos y mantiene la selección", () => {
    const html = render(
      createElement(BoxTabs, {
        boxes: boxes.slice(0, 3),
        includeAll: true,
        allHref: "/staff/cobros",
        hrefFor,
      }),
    );
    expect(html).not.toContain('role="combobox"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Todos");
  });

  it("cambia a desplegable con cuatro sedes", () => {
    const html = render(createElement(BoxTabs, { boxes, boxId: "0", hrefFor }));
    expect(html).toContain('role="combobox"');
  });
});

describe("muestras solo de desarrollo", () => {
  it("no expone las muestras en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => DevCompositionPage()).toThrow("NOT_FOUND");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("imágenes sin almacenamiento local", () => {
  it("conserva tamaño y etiqueta cuando falta la imagen", () => {
    const html = render(createElement(ResourceImage, {
      alt: "Imagen actual del entrenamiento de fuerza y movilidad",
      className: "h-32 w-full", width: 240, height: 128,
    }));
    expect(html).not.toContain("<img");
    expect(html).toContain('role="img"');
    expect(html).toContain("Imagen actual del entrenamiento de fuerza y movilidad");
    expect(html).toContain("width:240px;height:128px");
    expect(html).not.toContain("/uploads/");
  });
});

describe("panel de filtros y ordenación", () => {
  it("cuenta filtros aplicados y excluye Todos", () => {
    const html = render(createElement(ListOptions, {
      path: "/staff/equipo", order: "nombre-desc", sortOptions: PERSON_SORTS,
      filters: [
        { key: "estado", label: "Estado", value: "baja", options: [{ value: "baja", label: "Dados de baja" }] },
        { key: "rol", label: "Rol", value: "todos", options: [{ value: "todos", label: "Todos" }] },
      ],
    }));
    expect(html).toContain("Filtrar y ordenar");
    expect(html).toContain('aria-label="1 filtro activo"');
  });
  it("no muestra un contador cuando no hay filtros activos", () => {
    const html = render(createElement(ListOptions, {
      path: "/staff/socios", order: PERSON_SORTS[0].value, sortOptions: PERSON_SORTS,
      filters: [{ key: "estado", label: "Estado", value: "todos", options: [{ value: "todos", label: "Todos" }] }],
    }));
    expect(html).not.toContain("filtros activos");
  });
});
