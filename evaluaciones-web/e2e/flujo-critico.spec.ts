import { test, expect, type Page } from '@playwright/test'

// Flujo crítico end-to-end (tarea 22):
// estudiante practica y ve la explicación → estudiante presenta examen con
// temporizador → profesor revisa resultados.
//
// Requisitos previos: API en :3000, BD migrada + sembrada (usuarios de ejemplo)
// y un examen con práctica habilitada (el seed crea "Examen diagnóstico").

// La barra de navegación; evita ambigüedad con enlaces del dashboard/logo.
const nav = (page: Page) => page.getByRole('navigation')

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL('/')
}

test('estudiante practica y recibe retroalimentación', async ({ page }) => {
  await login(page, 'estudiante2@examenes.local', 'estudiante1234')
  await nav(page).getByRole('link', { name: 'Mis exámenes' }).click()
  await expect(page).toHaveURL(/\/mis-examenes/)

  // Inicia una práctica del primer examen disponible que la permita.
  const practicar = page.getByRole('button', { name: 'Practicar' }).first()
  await expect(practicar).toBeVisible()
  await practicar.click()

  // Responde la primera pregunta (opción o texto, según el tipo) y comprueba.
  await expect(page).toHaveURL(/\/practica\//)
  const opcion = page.locator('input[type="radio"], input[type="checkbox"]').first()
  if (await opcion.count()) await opcion.check()
  else await page.locator('textarea').first().fill('Respuesta de práctica')
  await page.getByRole('button', { name: 'Comprobar' }).click()

  // El FeedbackPanel debe mostrar el resultado (correcto/incorrecto/respuesta modelo).
  await expect(page.getByText(/Respuesta correcta|Correcto|Incorrecto|Respuesta modelo/)).toBeVisible()
})

test('estudiante presenta examen con temporizador', async ({ page }) => {
  await login(page, 'estudiante1@examenes.local', 'estudiante1234')
  await nav(page).getByRole('link', { name: 'Mis exámenes' }).click()
  await expect(page).toHaveURL(/\/mis-examenes/)

  await page.getByRole('button', { name: 'Presentar' }).first().click()
  await expect(page).toHaveURL(/\/intentos\//)

  // El temporizador se muestra en formato mm:ss.
  await expect(page.getByText(/^\d{2}:\d{2}$/)).toBeVisible()

  // Responde (si hay opciones) y entrega.
  const opcion = page.locator('input[type="radio"]').first()
  if (await opcion.count()) await opcion.check()
  await page.getByRole('button', { name: 'Entregar examen' }).click()
  await expect(page).toHaveURL(/\/resultado/)
})

test('profesor ve resultados del examen', async ({ page }) => {
  await login(page, 'profesor@examenes.local', 'profesor1234')
  await nav(page).getByRole('link', { name: 'Exámenes', exact: true }).click()
  await expect(page).toHaveURL(/\/examenes/)

  await page.getByRole('link', { name: 'Resultados' }).first().click()
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(page.getByText('Acierto por pregunta')).toBeVisible()
})
