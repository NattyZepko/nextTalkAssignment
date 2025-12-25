import { redirect } from 'next/navigation';

export default function Home() {
    // Show SERP first per instructions
    redirect('/search');
}
