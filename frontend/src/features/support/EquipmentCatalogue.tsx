import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FactList, FormActions, FormField,
  FormSection, LoadingState, PageLayout, StatusPill, useLoad, useSession, type ApiResult, formatDateRange,
} from '../../shared';
import { getEquipment, listEquipment, retireEquipment, saveEquipment, type Equipment, type EquipmentInput, type ReservationReview } from './equipmentApi';

const blank: EquipmentInput = {name:'',category:'',description:'',total_quantity:0,home_location:'',operational_status:'available'};
export function EquipmentCatalogue() {
  const session = useSession();
  const editable = session.status === 'signed-in' && session.user.role === 'technical_support_staff';
  const {result, reload} = useLoad(listEquipment, []);
  const location = useLocation();
  const saved = location.state as {message?: string; affected?: ReservationReview[]} | null;
  const [retiring, setRetiring] = useState<Equipment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(saved?.message ?? '');
  const affected = saved?.affected ?? [];
  const [blocking, setBlocking] = useState<ReservationReview[]>([]);
  async function retire() {
    if (!retiring || busy) return;
    setBusy(true); setError(''); setBlocking([]);
    try {
      const outcome = await retireEquipment(retiring.id);
      if (!outcome.ok) {
        setError(outcome.message);
        setBlocking((outcome.details?.blockingReservations as ReservationReview[]) ?? []);
      } else { setMessage(`${retiring.name} retired. Past reservations are retained.`); setRetiring(null); reload(); }
    } finally {setBusy(false);}
  }
  return <PageLayout eyebrow="Technical support" title="Equipment catalogue"
    actions={editable ? <ButtonLink to="/support/catalogue/new" variant="primary">Add equipment</ButtonLink> : undefined}>
    {message && <Alert tone="success">{message}</Alert>}
    {affected.length > 0 && <Alert tone="warning" title="Reservations need review">
      <p>Affected reservations were flagged and eligible Coordinators notified.</p>
      <ul>{affected.map(r => <li key={r.id}>{r.eventCode ?? r.title}: {r.quantity} units reserved</li>)}</ul>
    </Alert>}
    {retiring && <ConfirmPanel title={`Retire ${retiring.name}?`} description="Retirement removes this item from availability checks and retains its history. Active reservations must be resolved first."
      confirmLabel="Confirm retirement" busyLabel="Retiring…" danger busy={busy} error={error} onConfirm={retire} onCancel={() => {if (!busy) {setRetiring(null);setError('');setBlocking([]);}}} />}
    {blocking.length > 0 && <Card title="Reservations preventing retirement"><ul>{blocking.map(r => <li key={r.id}>{r.eventCode ?? r.title}: {r.quantity} units</li>)}</ul></Card>}
    {result.state === 'loading' ? <LoadingState label="Loading equipment…" />
      : result.state === 'error' ? <ErrorState failure={result.failure} context="equipment" onRetry={reload} />
      : result.data.equipment.length === 0 ? <EmptyState title="No equipment yet">Technical Support Staff can add equipment to start the catalogue.</EmptyState>
      : <DataTable caption="Equipment inventory" rows={result.data.equipment} rowKey={item => item.id} columns={[
        {header:'Equipment',primary:true,cell:item=><Link to={`/support/catalogue/${item.id}`}>{item.name}</Link>},
        {header:'Type',cell:item=>item.category},
        {header:'Quantity',cell:item=>item.total_quantity},
        {header:'Location',cell:item=>item.home_location},
        {header:'Status',cell:item=><StatusPill status={item.operational_status === 'available' ? 'success' : 'warning'} label={item.operational_status === 'available' ? 'Working' : 'Under maintenance'} />},
        {header:'Actions',cell:item=>editable ? <>
          <ButtonLink to={`/support/catalogue/${item.id}/edit`}>Edit {item.name}</ButtonLink>
          <Button onClick={() => {setRetiring(item);setError('');setBlocking([]);}}>Retire {item.name}…</Button>
        </> : 'View only'},
      ]} />}

  </PageLayout>;
}
export function EquipmentForm({equipment,onCancel,onSaved}: {equipment?: Equipment;onCancel:()=>void;onSaved:(item:Equipment,affected:ReservationReview[])=>void}) {
  const [values,setValues] = useState<EquipmentInput>(equipment ? {...equipment, operational_status: equipment.operational_status === 'available' ? 'available' : 'maintenance'} : blank);
  const [quantity,setQuantity] = useState(String(values.total_quantity));
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [errors,setErrors] = useState<Record<string,string[]>>({});
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    if (!/^\d+$/.test(quantity)) {setErrors({total_quantity:['Quantity must be a whole number of 0 or more.']});return;}
    setSaving(true);setMessage('');setErrors({});
    try {
      const result = await saveEquipment({...values,total_quantity:Number(quantity)},equipment?.id);
      if (result.ok) onSaved(result.data.equipment,result.data.affectedReservations);
      else {setMessage(result.message);setErrors(result.fieldErrors ?? {});}
    } finally {setSaving(false);}
  }
  function field(key: 'name'|'category'|'description'|'home_location',label:string,maxLength:number) {
    return <FormField label={label} error={errors[key]?.[0]}>{props => <input {...props} required maxLength={maxLength} value={values[key]} disabled={saving}
      onChange={event => setValues(current=>({...current,[key]:event.target.value}))} />}</FormField>;
  }
  return <Card title={equipment ? `Edit ${equipment.name}` : 'Add equipment'}>
    {message && <Alert tone="error">{message}</Alert>}
    <form onSubmit={submit}>
      <FormSection title="Equipment details">
        {field('name','Equipment name',160)}{field('category','Type',120)}{field('description','Description',4000)}
        <FormField label="Quantity" hint="Reducing stock may flag active reservations for review." error={errors.total_quantity?.[0]}>{props=><input {...props} required type="number" min="0" max="2147483647" step="1" value={quantity} disabled={saving} onChange={event=>setQuantity(event.target.value)} />}</FormField>
        {field('home_location','Location',255)}
        <FormField label="Operational status" error={errors.operational_status?.[0]}>{props=><select {...props} value={values.operational_status} disabled={saving} onChange={event=>setValues(current=>({...current,operational_status:event.target.value as EquipmentInput['operational_status']}))}>
          <option value="available">Working</option><option value="maintenance">Under maintenance</option>
        </select>}</FormField>
      </FormSection>
      <FormActions><Button disabled={saving} onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" busy={saving} busyLabel="Saving…">Save equipment</Button></FormActions>
    </form>
  </Card>;
}

export function EquipmentFormPage() {
  const {equipmentId} = useParams();
  const navigate = useNavigate();
  const {result,reload} = useLoad<Equipment | null>(signal => equipmentId ? getEquipment(equipmentId,signal) : Promise.resolve<ApiResult<null>>({ok:true,data:null}),[equipmentId ?? 'new']);
  return <PageLayout eyebrow="Technical support" title={equipmentId ? 'Edit equipment' : 'Add equipment'} width="narrow">
    {result.state === 'loading' ? <LoadingState label="Loading equipment…" />
      : result.state === 'error' ? <ErrorState failure={result.failure} context="this equipment" onRetry={reload} />
      : result.data && !result.data.is_active ? <Alert tone="warning">Retired equipment cannot be edited.</Alert>
      : <EquipmentForm key={equipmentId ?? 'new'} equipment={result.data ?? undefined} onCancel={()=>navigate('/support/catalogue')}
        onSaved={(item,affected)=>navigate('/support/catalogue',{state:{message:`${item.name} saved.`,affected}})} />}
  </PageLayout>;
}
export function EquipmentDetail() {
  const {equipmentId = ''} = useParams();
  const session = useSession();
  const {result,reload} = useLoad(signal=>getEquipment(equipmentId,signal),[equipmentId]);
  return <PageLayout eyebrow="Technical support" title="Equipment details" width="narrow">
    {result.state === 'loading' ? <LoadingState label="Loading equipment…" />
      : result.state === 'error' ? <ErrorState failure={result.failure} context="this equipment" onRetry={reload} />
      : <Card title={result.data.name} actions={<StatusPill status={!result.data.is_active?'neutral':result.data.operational_status==='available'?'success':'warning'} label={!result.data.is_active?'Retired':result.data.operational_status==='available'?'Working':'Under maintenance'} />}>
        <FactList columns={2} items={[
          ['Type',result.data.category],['Description',result.data.description],['Quantity',result.data.total_quantity],['Location',result.data.home_location],
        ]} />
        <section aria-label="Reservation history">
          <h3>Reservation history</h3>
          {!result.data.reservations?.length ? <EmptyState title="No reservations yet">This equipment has no reservation history.</EmptyState>
            : <DataTable caption="Reservation history" rows={result.data.reservations} rowKey={r=>r.id} columns={[
          {header:'Event',primary:true,cell:r=>r.eventCode ?? r.title},
          {header:'Period',cell:r=>formatDateRange(r.startsAt,r.endsAt)},
          {header:'Quantity',cell:r=>r.quantity},
          {header:'Status',cell:r=>r.requiresReconfirmation?'Needs review':r.status},
        ]} />}
        </section>
        {result.data.is_active && session.status==='signed-in' && session.user.role==='technical_support_staff' && <ButtonLink to={`/support/catalogue/${equipmentId}/edit`}>Edit equipment</ButtonLink>}
      </Card>}
    <ButtonLink to="/support/catalogue">Back to catalogue</ButtonLink>
  </PageLayout>;
}
