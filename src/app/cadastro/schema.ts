import { z } from "zod"

import { isValidCpfCnpj } from "@/lib/validation/cpf-cnpj"

// Unico form do projeto validado com Zod (ver ADR — os demais server actions
// existentes validam manualmente com `if` soltos; este form tem validacao
// cruzada e de digito verificador o suficiente pra justificar o schema).

const digitsOnly = (value: string) => value.replace(/\D/g, "")

export const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Informe o nome do seu negócio."),
  businessType: z.enum(["SALON", "CLINIC"]),
  responsibleName: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  document: z
    .string()
    .transform(digitsOnly)
    .refine((v) => v.length === 11 || v.length === 14, {
      message: "Informe um CPF ou CNPJ válido.",
    })
    .refine(isValidCpfCnpj, { message: "Informe um CPF ou CNPJ válido." }),
  phone: z
    .string()
    .transform(digitsOnly)
    .refine((v) => v.length >= 10, { message: "Informe um WhatsApp válido." }),
  cycle: z.enum(["MONTHLY", "YEARLY"]),
})

export type SignupInput = z.infer<typeof signupSchema>
