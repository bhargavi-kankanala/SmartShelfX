-- Create stock_requests table for vendor requests/notifications
CREATE TABLE public.stock_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id),
    requested_by_name TEXT,
    requested_by_role TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    response_notes TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_requests ENABLE ROW LEVEL SECURITY;

-- Admins and warehouse managers can create requests
CREATE POLICY "Admins and warehouse managers can create requests"
ON public.stock_requests
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'warehouse_manager'::app_role)
);

-- Vendors can only see requests targeted to them
CREATE POLICY "Vendors can view their own requests"
ON public.stock_requests
FOR SELECT
USING (
    vendor_id IN (
        SELECT p.vendor_id FROM profiles p WHERE p.user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'warehouse_manager'::app_role)
);

-- Vendors can update (respond to) their own requests
CREATE POLICY "Vendors can respond to their requests"
ON public.stock_requests
FOR UPDATE
USING (
    vendor_id IN (
        SELECT p.vendor_id FROM profiles p WHERE p.user_id = auth.uid()
    )
);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests"
ON public.stock_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_stock_requests_updated_at
BEFORE UPDATE ON public.stock_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for stock_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_requests;