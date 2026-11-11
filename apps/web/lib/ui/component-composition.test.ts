import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormActions } from "@/components/common/forms/form-actions";
import { PaymentFields } from "@/components/payments/payment-fields";
import DevCompositionPage from "@/app/dev/component-composition/page";
import { BoxTabs } from "@/components/boxes/box-tabs";

vi.stubGlobal("React", React);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/staff/cobros",
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

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
      expect(() => DevCompositionPage({ searchParams: Promise.resolve({}) })).toThrow("NOT_FOUND");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
