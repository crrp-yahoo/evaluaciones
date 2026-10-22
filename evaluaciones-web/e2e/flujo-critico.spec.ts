import { test, expect } from '@playwright/test'

// Flujo crítico end-to-end (tarea 22):
// profesor crea pregunta con explicación → publica examen con práctica →
// estudiante practica y ve la explicación → estudiante presenta examen →
// profesor revisa resultados.
//
// Requisitos previos: API en :3000, BD migrada + sembrada (usuarios de ejemplo),
// y un examen con práctica habilitada (el seed crea "Examen diagnóstico").

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL('/')
}

test('estudiante practica y recibe retroalimentación', async ({ page }) => {
  await login(page, 'estudiante2@examenes.local', 'estudiante1234')
  await page.getByRole('link', { name: 'Mis exámenes' }).click()

  // Inicia una práctica del primer examen disponible que la permita.
  const practicar = page.getByRole('button', { name: 'Practicar' }).first()
  await expect(practicar).toBeVisible()
  await practicar.click()

  // Responde la primera pregunta y comprueba que aparece el panel de feedback.
  await expect(page).toHaveURL(/\/practica\//)
  const primeraOpcion = page.locator('input[type="radio"], input[type="checkbox"]').first()
  await primeraOpcion.check()
  await page.getByRole('button', { name: 'Comprobar' }).click()

  // El FeedbackPanel debe mostrar la respuesta correcta y/o explicación.
  await expect(page.getByText(/Respuesta correcta|Correcto|Incorrecto/)).toBeVisible()
})

test('estudiante presenta examen con temporizador', async ({ page }) => {
  await login(page, 'estudiante1@examenes.local', 'estudiante1234')
  await page.getByRole('link', { name: 'Mis exámenes' }).click()

  await page.getByRole('button', { name: 'Presentar' }).first().click()
  await expect(page).toHaveURL(/\/intentos\//)

  // Debe verse el temporizador (mm:ss) con aria-live.
  await expect(page.locator('[aria-live="polite"]')).toBeVisible()

  // Responde y entrega.
  const opcion = page.locator('input[type="radio"]').first()
  if (await opcion.count()) await opcion.check()
  await page.getByRole('button', { name: 'Entregar examen' }).click()
  await expect(page).toHaveURL(/\/resultado/)
})

test('profesor ve resultados del examen', async ({ page }) => {
  await login(page, 'profesor@examenes.local', 'profesor1234')
  await page.getByRole('link', { name: 'Exámenes' }).click()
  await page.getByRole('link', { name: 'Resultados' }).first().click()
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(page.getByText('Acierto por pregunta')).toBeVisible()
})
