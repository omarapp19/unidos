import { useCallback, useState, type FormEvent } from 'react';
import { Building2, AtSign, Globe, Mail } from 'lucide-react';
import { suggestCenter } from '@/lib/api/centers';
import { reverseGeocodeAddress } from '@/lib/geo';
import {
  isValidEmail,
  isValidInstagram,
  isValidPhoneNumber,
  isValidUrl,
  formatPhone,
  normalizeInstagram,
  normalizeUrl,
  toWhatsAppNumber,
} from '@/lib/validation';
import {
  Button,
  Modal,
  Input,
  AddressInput,
  Checkbox,
} from '@/components/ui';
import {
  PhoneField,
  ScheduleField,
  LocationField,
  EMPTY_PHONE,
  type PhoneValue,
} from '@/components/form';
import {
  EMPTY_BLOCK,
  isScheduleValid,
  serializeSchedule,
  type ScheduleBlock,
} from '@/lib/schedule';

type FormState = {
  name: string;
  organization: string;
  address: string;
  instagram: string;
  website: string;
  email: string;
  lat: string;
  lng: string;
};

type ErrorKey =
  | 'name'
  | 'organization'
  | 'address'
  | 'schedule'
  | 'phone'
  | 'instagram'
  | 'website'
  | 'email';
type Errors = Partial<Record<ErrorKey, string>>;

const EMPTY_FORM: FormState = {
  name: '',
  organization: '',
  address: '',
  instagram: '',
  website: '',
  email: '',
  lat: '',
  lng: '',
};

export interface SuggestCenterModalProps {
  open: boolean;
  onClose: () => void;
}

export function SuggestCenterModal({ open, onClose }: SuggestCenterModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [phone, setPhone] = useState<PhoneValue>(EMPTY_PHONE);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([{ ...EMPTY_BLOCK }]);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const phoneValid = isValidPhoneNumber(phone.number);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const handleMapClick = useCallback(async (latitude: number, longitude: number) => {
    setForm((f) => ({
      ...f,
      lat: latitude.toFixed(6),
      lng: longitude.toFixed(6),
    }));
    try {
      const resolvedAddress = await reverseGeocodeAddress({ lat: latitude, lng: longitude });
      if (resolvedAddress) {
        setForm((f) => ({
          ...f,
          address: resolvedAddress,
        }));
      }
    } catch (err) {
      console.error('Error al resolver la dirección:', err);
    }
  }, []);

  function validate(): Errors {
    const e: Errors = {};
    // Solo obligatorios: organización, dirección y ubicación (mapa).
    if (!form.organization.trim()) e.organization = 'Indica la organización (ej: Cruz Roja, etc).';
    if (!form.address.trim()) e.address = 'Ingresa la dirección o selecciónala en el mapa.';

    const scheduleTouched = schedule.some(
      (b) => b.days.length > 0 || b.open !== '' || b.close !== '',
    );
    if (scheduleTouched && !isScheduleValid(schedule))
      e.schedule = 'Completa día, apertura y cierre en cada bloque.';
    
    if (phone.number.trim() && !phoneValid) e.phone = 'Número de teléfono no válido.';
    if (form.instagram.trim() && !isValidInstagram(form.instagram))
      e.instagram = 'Usuario de Instagram no válido.';
    if (form.website.trim() && !isValidUrl(normalizeUrl(form.website)))
      e.website = 'URL no válida (ej. https://centro.org).';
    if (form.email.trim() && !isValidEmail(form.email)) e.email = 'Correo no válido.';
    
    return e;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const latVal = parseFloat(form.lat);
    const lngVal = parseFloat(form.lng);
    const hasValidCoords = !isNaN(latVal) && !isNaN(lngVal);

    if (!hasValidCoords) {
      setFormError('Por favor, selecciona una ubicación en el mapa haciendo clic en él.');
      return;
    }

    setLoading(true);

    const scheduleStr = serializeSchedule(schedule);
    const phoneStr = phone.number.trim() ? formatPhone(phone.dial, phone.number) : '';
    const whatsappStr =
      hasWhatsApp && phoneValid ? toWhatsAppNumber(phone.dial, phone.number) : '';
    const instagram = form.instagram.trim() ? normalizeInstagram(form.instagram) : '';
    const website = form.website.trim() ? normalizeUrl(form.website) : '';

    try {
      await suggestCenter({
        name: form.name,
        organization: form.organization,
        address: form.address,
        schedule: scheduleStr,
        phone: phoneStr,
        whatsapp: whatsappStr,
        instagram,
        website,
        email: form.email,
        lat: latVal,
        lng: lngVal,
      });
      setSuccess(true);
    } catch (err) {
      setFormError('Hubo un problema al enviar la sugerencia. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const closeAndReset = useCallback(() => {
    setForm(EMPTY_FORM);
    setPhone(EMPTY_PHONE);
    setSchedule([{ ...EMPTY_BLOCK }]);
    setHasWhatsApp(false);
    setErrors({});
    setFormError(null);
    setSuccess(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      title="Sugerir centro de acopio"
      subtitle="Envía la ubicación e información de un centro de acopio activo. No se hará público hasta que sea aprobado por el superadmin."
    >
      {success ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success-ink">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="font-display text-h3 font-black tracking-snug text-ink">
            ¡Sugerencia recibida!
          </h3>
          <p className="mt-2 max-w-sm font-body text-sm text-body">
            Gracias por cooperar. El centro de acopio ha sido registrado. Un superadmin revisará y aprobará los datos para que aparezca públicamente en el mapa.
          </p>
          <div className="mt-6 flex w-full justify-center">
            <Button variant="primary" onClick={closeAndReset}>
              Aceptar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
          <Input
            label="Nombre del centro (opcional)"
            placeholder="Liceo Andrés Bello"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
          />
          <Input
            label="Organización"
            requiredMark
            placeholder="Cruz Roja Venezolana, Parroquia, etc."
            value={form.organization}
            onChange={(e) => set('organization', e.target.value)}
            error={errors.organization}
          />
          <AddressInput
            label="Dirección"
            requiredMark
            placeholder="Escribe para buscar calle, sector o ciudad..."
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            onSelect={(address, lat, lng) => {
              setForm((f) => ({
                ...f,
                address,
                lat: lat.toFixed(6),
                lng: lng.toFixed(6),
              }));
            }}
            error={errors.address}
          />

          <LocationField
            required
            lat={form.lat ? parseFloat(form.lat) : null}
            lng={form.lng ? parseFloat(form.lng) : null}
            onChange={handleMapClick}
          />

          <ScheduleField
            label="Horario de recepción (opcional)"
            value={schedule}
            onChange={setSchedule}
            error={errors.schedule}
          />

          <PhoneField
            label="Teléfono (opcional)"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
          />
          <Checkbox
            label="Este número tiene WhatsApp"
            hint={phoneValid ? undefined : 'Disponible cuando el teléfono sea válido.'}
            checked={hasWhatsApp}
            disabled={!phoneValid}
            onChange={(e) => setHasWhatsApp(e.target.checked)}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Instagram (opcional)"
              placeholder="cruzroja_ve"
              leadingIcon={<AtSign className="h-4 w-4" aria-hidden />}
              value={form.instagram}
              onChange={(e) => set('instagram', e.target.value)}
              error={errors.instagram}
            />
            <Input
              label="Sitio web (opcional)"
              placeholder="https://centro.org"
              leadingIcon={<Globe className="h-4 w-4" aria-hidden />}
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              error={errors.website}
            />
          </div>
          <Input
            label="Correo de contacto (opcional)"
            type="email"
            placeholder="contacto@centro.org"
            leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
          />

          {formError && <p className="font-body text-sm text-danger-ink">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeAndReset} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Sugerir Centro
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
