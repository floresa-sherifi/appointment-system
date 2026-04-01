import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://ccpgolgnvkimhqdwoaqm.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcGdvbGdudmtpbWhxZHdvYXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMwMzUsImV4cCI6MjA4OTkyOTAzNX0.GF5_SDxdxc0CHTkmcAsK_cx8Mu97VXN2UTwrxueKllM"

export const supabase = createClient(supabaseUrl, supabaseKey)