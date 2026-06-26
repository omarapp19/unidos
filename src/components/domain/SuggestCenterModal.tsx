import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, AtSign, Globe, Mail } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import { PhoneField, ScheduleField, EMPTY_PHONE, type PhoneValue } from '@/components/form';
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

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 30px; height: 30px;
    background: var(--color-rojo);
    border: 3px solid #fff; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function LocationPickerMap({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);

  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={[lat, lng]} icon={pinIcon} />;
}

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
    if (!form.name.trim()) e.name = 'Ingresa el nombre del centro.';
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
            label="Nombre del centro"
            requiredMark
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

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-ink">
              Ubicación en el mapa *
            </label>
            <div className="h-44 w-full overflow-hidden rounded-xl border border-line z-0">
              <MapContainer
                center={[
                  parseFloat(form.lat) || 10.4806,
                  parseFloat(form.lng) || -66.9036
                ]}
                zoom={13}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPickerMap
                  lat={parseFloat(form.lat) || 10.4806}
                  lng={parseFloat(form.lng) || -66.9036}
                  onChange={handleMapClick}
                />
              </MapContainer>
            </div>
            <p className="font-body text-[11px] text-muted">
              Haz clic en el mapa para situar exactamente el marcador de ubicación.
            </p>
          </div>

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
