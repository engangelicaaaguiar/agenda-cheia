import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/app.js";

describe("App routes", () => {
  it("deve retornar HTML da landing page em GET /", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Uma unica plataforma. Tres jornadas coerentes.");
  });

  it("deve retornar HTML da jornada de primeiro login", async () => {
    const response = await request(app).get("/cadastro.html");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Validacao profissional com zero atrito.");
  });

  it("deve retornar HTML da jornada de login recorrente", async () => {
    const response = await request(app).get("/login.html");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Entrar com e-mail");
  });

  it("deve retornar 404 para rota inexistente", async () => {
    const response = await request(app).get("/rota-inexistente");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Rota nao encontrada" });
  });

  it("deve retornar 500 quando ocorrer erro interno", async () => {
    const response = await request(app).get("/error");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Erro interno do servidor" });
  });

  it("deve direcionar para onboarding no pos-login quando perfil incompleto", async () => {
    const response = await request(app).get("/api/session/post-login");

    expect(response.status).toBe(200);
    expect(response.body.redirectTo).toBe("/onboarding/step-1");
  });

  it("deve validar CRM e avancar onboarding", async () => {
    const response = await request(app)
      .post("/api/onboarding/validate-crm")
      .set("x-user-id", "doctor-test")
      .send({
        imageBase64: "data:image/mock;base64,AAAABBBB",
        phone: "(11) 99999-9999",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("valid");
    expect(response.body.extracted.crm_state).toBe("SP");
  });

  it("deve salvar step de especialidades", async () => {
    const response = await request(app)
      .post("/api/onboarding/save-step")
      .set("x-user-id", "doctor-test")
      .send({
        step: 2,
        data: {
          specialties: [
            { specialty_id: 2, is_primary: true },
            { specialty_id: 4, is_primary: false },
          ],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("deve finalizar perfil e redirecionar para dashboard", async () => {
    const completeResponse = await request(app)
      .put("/api/doctors/profile")
      .set("x-user-id", "doctor-test")
      .send({ complete: true });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.doctor.is_profile_complete).toBe(true);
    expect(completeResponse.body.trigger.indexed_for_matching).toBe(true);

    const redirectResponse = await request(app)
      .get("/api/session/post-login")
      .set("x-user-id", "doctor-test");

    expect(redirectResponse.status).toBe(200);
    expect(redirectResponse.body.redirectTo).toBe("/dashboard");
  });
});
