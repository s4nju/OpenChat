'use client';

import { motion } from 'motion/react';
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { PERSONAS } from '@/lib/config';
import { TRANSITION_SUGGESTIONS } from '@/lib/motion';
import { cn } from '@/lib/utils';

type ButtonPersonaProps = {
  label: string;
  prompt: string;
  onSelectSystemPrompt: (systemPrompt: string) => void;
  systemPrompt?: string;
  icon: React.ElementType;
};

const ButtonPersona = memo(function ButtonPersonaComponent({
  label,
  prompt,
  onSelectSystemPrompt,
  systemPrompt,
  icon,
}: ButtonPersonaProps) {
  const isActive = systemPrompt === prompt;
  const Icon = icon;

  return (
    <Button
      className={cn(
        'rounded-full',
        isActive &&
          'bg-primary text-primary-foreground transition-none hover:bg-primary/90 hover:text-primary-foreground'
      )}
      key={label}
      onClick={() =>
        isActive ? onSelectSystemPrompt('') : onSelectSystemPrompt(prompt)
      }
      size="lg"
      type="button"
      variant="outline"
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
});

type PersonasProps = {
  onSelectSystemPrompt: (systemPrompt: string) => void;
  systemPrompt?: string;
};

export const Personas = memo(function PersonasComponent({
  onSelectSystemPrompt,
  systemPrompt,
}: PersonasProps) {
  return (
    <motion.div
      animate="animate"
      className="flex w-full max-w-full flex-nowrap justify-start gap-2 overflow-x-auto px-2 md:mx-auto md:max-w-2xl md:flex-wrap md:justify-center md:pl-0"
      exit="exit"
      initial="initial"
      style={{
        scrollbarWidth: 'none',
      }}
      transition={TRANSITION_SUGGESTIONS}
      variants={{
        initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
      }}
    >
      {PERSONAS.map((persona, index) => (
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.8 }}
          key={persona.label}
          transition={{
            ...TRANSITION_SUGGESTIONS,
            delay: index * 0.02,
          }}
        >
          <ButtonPersona
            icon={persona.icon}
            key={persona.label}
            label={persona.label}
            onSelectSystemPrompt={onSelectSystemPrompt}
            prompt={persona.prompt}
            systemPrompt={systemPrompt}
          />
        </motion.div>
      ))}
    </motion.div>
  );
});
