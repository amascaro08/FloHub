import { NextApiRequest, NextApiResponse } from 'next';
import { generateCSRFTokenHandler } from '@/lib/csrfProtection';

export default generateCSRFTokenHandler;