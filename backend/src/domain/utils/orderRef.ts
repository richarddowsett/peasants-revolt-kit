export function generateNextMonzoReference(
  existingOrders: { id?: string; monzoReference?: string }[] = []
): string {
  const existingRefs = new Set<string>();
  for (const order of existingOrders) {
    if (order.id) existingRefs.add(order.id.toUpperCase());
    if (order.monzoReference) existingRefs.add(order.monzoReference.toUpperCase());
  }

  let counter = 1;
  while (true) {
    const formattedNum = String(counter).padStart(4, '0');
    const ref = `PRRC-${formattedNum}`;
    if (!existingRefs.has(ref)) {
      return ref;
    }
    counter++;
  }
}

export function generateNextEventTicketReference(
  existingTickets: { id?: string; monzoReference?: string }[] = [],
  year: number
): string {
  const existingRefs = new Set<string>();
  for (const ticket of existingTickets) {
    if (ticket.id) existingRefs.add(ticket.id.toUpperCase());
    if (ticket.monzoReference) existingRefs.add(ticket.monzoReference.toUpperCase());
  }

  let counter = 1;
  while (true) {
    const formattedNum = String(counter).padStart(4, '0');
    const ref = `PRRC-EVT-${year}-${formattedNum}`;
    if (!existingRefs.has(ref)) {
      return ref;
    }
    counter++;
  }
}
