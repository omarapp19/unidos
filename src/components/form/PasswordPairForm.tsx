import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/ui';

/* ===========================================================================
   Formulario reutilizable para fijar una contraseña nueva (recuperación y
   cambio desde el panel). Valida en cliente las mismas reglas del registro
   (mínimo 8 caracteres + confirmación) y delega el envío al consumidor vía
   `onSubmit(password)`. El error del servidor llega por `serverError`.
   ========================================================================== */

const MIN_LENGTH = 8;

interface PasswordPairFormProps {
  onSubmit: (password: string) => void | Promise<void>;
  loading?: boolean;
  /** Error proveniente del servidor (p. ej. "la nueva debe ser distinta"). */
  serverError?: string | null;
  submitLabel?: string;
}

export function PasswordPairForm({
  onSubmit,
  loading = false,
  serverError,
  submitLabel = 'Guardar contraseña',
}: PasswordPairFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: { password?: string; confirm?: string } = {};
    if (!password) next.password = 'Crea una contraseña.';
    else if (password.length < MIN_LENGTH) next.password = `Mínimo ${MIN_LENGTH} caracteres.`;
    if (confirm !== password) next.confirm = 'Las contraseñas no coinciden.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    void onSubmit(password);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Nueva contraseña"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="••••••••"
        leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
        trailingIcon={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rounded-full p-1.5 hover:bg-surface-2 transition text-muted hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <Input
        label="Confirmar contraseña"
        type={showConfirm ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="••••••••"
        leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
        trailingIcon={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="rounded-full p-1.5 hover:bg-surface-2 transition text-muted hover:text-ink focus-visible:shadow-ring-azul focus-visible:outline-none"
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm ?? serverError ?? undefined}
      />
      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
